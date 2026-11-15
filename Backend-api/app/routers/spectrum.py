"""On-the-fly spectrum endpoint.

GET /spectrum – aperture-photometry spectrum for a clicked position.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from app.dependencies import OptionalRedis
from app.schemas.spectrum import SpectralPoint, SpectrumResponse
from app.services import irsa as irsa_svc
from app.services.spectrum import extract_spectrum

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/spectrum", tags=["spectrum"])


@router.get("", response_model=SpectrumResponse, summary="On-the-fly NIR spectrum")
async def get_spectrum(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Target RA (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Target Dec (degrees)"),
    url: str = Query(..., description="IRSA cutout URL for the target epoch"),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
) -> SpectrumResponse:
    """Generate an approximate near-infrared spectrum at a sky position.

    If the requested URL is unavailable (503), automatically tries other
    epoch URLs for the same field before failing.

    Args:
        ra: Right Ascension of the target in degrees.
        dec: Declination of the target in degrees.
        url: IRSA cutout URL.
        redis: Injected Redis client for FITS byte caching.

    Returns:
        SpectrumResponse with per-plane wavelength and flux values.
    """
    hdul = None
    used_url = url

    # Try the requested URL first
    try:
        hdul = await irsa_svc.fetch_cutout_fits(url, redis_client=redis)
    except Exception as primary_exc:
        logger.warning("Primary URL failed for spectrum, trying fallbacks: %s", primary_exc)
        # Try other epochs for the same field
        try:
            rows = await irsa_svc.query_spherex_obscore(ra, dec, 0.5)
            cutouts = irsa_svc.build_cutout_info_list(rows, {})
            for cutout in cutouts:
                fallback = cutout.cutout_url.replace("size=0.5d", "size=0.1d")
                if fallback == url:
                    continue
                try:
                    hdul = await irsa_svc.fetch_cutout_fits(fallback, redis_client=redis)
                    used_url = fallback
                    logger.info("Spectrum using fallback URL: %s", fallback[:60])
                    break
                except Exception:
                    continue
        except Exception:
            pass

        if hdul is None:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Could not download any cutout for spectrum extraction. "
                    "IRSA may be temporarily overloaded. Try again in a few minutes."
                ),
            ) from primary_exc

    # Extract OBSID and bandpass from FITS header if present
    primary_header = hdul[0].header
    obsid = str(primary_header.get("OBSID", "unknown"))
    bandpass_id = str(primary_header.get("BANDPASS", "unknown"))

    spectral_points = extract_spectrum(hdul, ra, dec)

    if not spectral_points:
        raise HTTPException(
            status_code=422,
            detail=(
                "No spectral data could be extracted at the requested position. "
                "The target may be outside the cutout or the IMAGE extension is empty."
            ),
        )

    return SpectrumResponse(
        ra=ra,
        dec=dec,
        obsid=obsid,
        bandpass_id=bandpass_id,
        n_planes=len(spectral_points),
        points=[
            SpectralPoint(
                wavelength_um=p.wavelength_um,
                flux_mjy_sr=p.flux_mjy_sr,
                flux_error_mjy_sr=p.flux_error_mjy_sr,
            )
            for p in spectral_points
        ],
        quick_look=True,
        note="Approximate photometry; not a replacement for IRSA's full spectrophotometry tool.",
    )
