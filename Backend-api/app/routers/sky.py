"""Sky Card and cutout endpoints.

Implements three routes:
  GET /sky/card   – narrative sky card for a RA/Dec position
  GET /sky/cutout – single cutout image served as PNG
  GET /sky/blink  – sequence of PNG frames ready for a blink comparator
"""

from __future__ import annotations

import io
import logging
from datetime import datetime

import numpy as np
from astropy.visualization import ZScaleInterval
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.config import settings
from app.dependencies import AnomalyLookup, OptionalRedis
from app.schemas.sky import SkyCardResponse
from app.services import anomaly as anomaly_svc
from app.services import irsa as irsa_svc
from app.services.align import align_epochs
from app.services.flags import extract_flags_from_hdul, flags_to_json_serializable

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sky", tags=["sky"])


def _build_narrative(
    ra: float,
    dec: float,
    n_epochs: int,
    epoch_range: tuple[datetime, datetime] | None,
    n_anomalies: int,
) -> str:
    """Generate a human-readable narrative summary for the sky card.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        n_epochs: Number of SPHEREx epochs at this position.
        epoch_range: Tuple of (earliest, latest) epoch timestamps.
        n_anomalies: Number of images with anomaly flags.

    Returns:
        Narrative string.
    """
    if n_epochs == 0:
        return (
            f"No SPHEREx observations found at RA {ra:.4f}°, Dec {dec:.4f}°. "
            "This field may not yet have been observed, or the coordinates may be "
            "outside the current survey footprint."
        )

    epoch_desc = ""
    if epoch_range:
        t0, t1 = epoch_range
        epoch_desc = (
            f" spanning {t0.strftime('%Y-%m-%d')} to {t1.strftime('%Y-%m-%d')}"
        )

    anom_desc = ""
    if n_anomalies:
        anom_desc = (
            f" Note: {n_anomalies} observation(s) carry anomaly flags "
            "(see individual cutout warnings)."
        )

    return (
        f"SPHEREx has observed this field ({ra:.4f}°, {dec:.4f}°) in "
        f"{n_epochs} epoch(s){epoch_desc}. "
        f"Use the blink comparator to look for objects that have moved or "
        f"changed brightness between epochs.{anom_desc}"
    )


@router.get("/card", response_model=SkyCardResponse, summary="Sky card for a RA/Dec")
async def sky_card(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Right Ascension (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Declination (degrees)"),
    size: float = Query(
        settings.default_cutout_size_deg,
        ge=0.001,
        le=settings.max_cutout_size_deg,
        description="Search radius / cutout size (degrees)",
    ),
    anomaly_lookup: AnomalyLookup = ...,  # type: ignore[assignment]
) -> SkyCardResponse:
    """Return a narrative sky card describing all SPHEREx observations at a position.

    Queries IRSA TAP for all images overlapping (ra, dec) within ``size``
    degrees, attaches anomaly flags, and returns a JSON payload suitable for
    the frontend Sky Card view.

    Args:
        ra: Right Ascension in degrees [0, 360).
        dec: Declination in degrees [-90, 90].
        size: Search radius in degrees.
        anomaly_lookup: Injected anomaly lookup dict (populated at startup).

    Returns:
        SkyCardResponse with cutout metadata and narrative text.
    """
    # ── Primary: IRSA TAP ─────────────────────────────────────────────────────
    rows: list[dict] = []
    irsa_failed = False
    try:
        rows = await irsa_svc.query_spherex_obscore(ra, dec, size)
    except Exception as exc:
        logger.warning("TAP query failed, trying S3 fallback: %s", exc)
        irsa_failed = True

    # ── Fallback 1: direct S3 HiPS / level-2 lookup ───────────────────────────
    if irsa_failed or not rows:
        try:
            from app.services.s3_spherex import query_spherex_hips, query_spherex_s3  # noqa: PLC0415

            s3_results = await query_spherex_hips(ra, dec)
            if not s3_results:
                s3_results = await query_spherex_s3(ra, dec, max_weeks=10, detectors=[1, 4])
            if s3_results:
                rows = [
                    {
                        "obsid": r.obsid,
                        "bandpass_id": r.bandpass_id,
                        "epoch_timestamp": r.mjd_obs,
                        "cutout_url": r.s3_url,
                    }
                    for r in s3_results
                ]
        except Exception as s3_exc:
            logger.warning("S3 fallback failed: %s", s3_exc)

    # ── Fallback 2: unWISE / NEOWISE epochs (real infrared images, dated) ─────
    # The S3 fallback only gives one SPHEREx coadd, so add the 2010-2018 NEOWISE
    # epochs whenever IRSA could not supply the real multi-epoch list.
    if irsa_failed or not rows:
        try:
            from astropy.time import Time  # noqa: PLC0415
            from app.services.unwise import fetch_unwise_blink_frames  # noqa: PLC0415

            frames = await fetch_unwise_blink_frames(ra, dec, band=1, size_px=200)
            for f in frames:
                rows.append(
                    {
                        "obsid": f"unWISE_{f.version}",
                        "bandpass_id": "unWISE-W1",
                        "epoch_timestamp": Time(float(f.mjd_mid), format="mjd").to_datetime().isoformat(),
                        # Relative path; the frontend resolves it against the API base.
                        "cutout_url": (
                            f"/unwise/blink/frame?ra={ra}&dec={dec}"
                            f"&version={f.version}&band=1&size=200"
                        ),
                    }
                )
        except Exception as uw_exc:
            logger.warning("unWISE fallback failed: %s", uw_exc)

    if not rows and irsa_failed:
        raise HTTPException(
            status_code=503,
            detail="NASA's archives are not responding right now. Try again in a few minutes.",
        )

    cutouts = irsa_svc.build_cutout_info_list(rows, anomaly_lookup)
    n_epochs = len(cutouts)

    epoch_timestamps = [c.epoch_timestamp for c in cutouts if c.epoch_timestamp]
    epoch_range = (min(epoch_timestamps), max(epoch_timestamps)) if epoch_timestamps else None

    n_anomalies = sum(1 for c in cutouts if c.anomaly_flags)
    narrative = _build_narrative(ra, dec, n_epochs, epoch_range, n_anomalies)
    n_unwise = sum(1 for c in cutouts if c.obsid.startswith("unWISE_"))
    if n_unwise:
        n_spherex = n_epochs - n_unwise
        spherex_part = (
            f"{n_spherex} SPHEREx image(s) from 2025 and " if n_spherex else ""
        )
        narrative = (
            f"NASA's IRSA archive is not answering right now, so this field "
            f"({ra:.4f}°, {dec:.4f}°) is shown with {spherex_part}{n_unwise} NEOWISE infrared "
            f"images (3.4 µm) taken between 2010 and 2018. Step back through the timeline "
            f"to see older images of the same patch of sky."
        )

    return SkyCardResponse(
        ra=ra,
        dec=dec,
        size_deg=size,
        n_epochs=n_epochs,
        epoch_range=epoch_range,
        cutouts=cutouts,
        narrative=narrative,
    )


@router.get(
    "/cutout",
    response_class=Response,
    summary="Single cutout image as PNG",
    responses={200: {"content": {"image/png": {}}}},
)
async def sky_cutout(
    url: str = Query(..., description="IRSA cutout URL (from /sky/card)"),
    ra: float = Query(None, description="Field RA — used to find fallback URLs if this one fails"),
    dec: float = Query(None, description="Field Dec — used to find fallback URLs if this one fails"),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
    anomaly_lookup: AnomalyLookup = ...,  # type: ignore[assignment]
) -> Response:
    """Download a SPHEREx cutout and return it as a PNG image.

    If the requested URL returns 503 (IRSA server overload on recent data),
    automatically tries other epochs for the same field if ra/dec are provided.

    Args:
        url: Primary IRSA cutout URL.
        ra: Optional field RA for fallback lookup.
        dec: Optional field Dec for fallback lookup.
        redis: Optional Redis client.
        anomaly_lookup: Anomaly lookup dict.

    Returns:
        PNG image response.
    """
    hdul = None

    # ── HiPS cube: use range-based channel extraction (no full download) ──────
    if "hips5_cube" in url or ("s3.amazonaws.com" in url and "_cube.fits" in url):
        try:
            from app.services.hips_image import fetch_hips_channel_png  # noqa: PLC0415
            # Use channel 0 (0.75 µm) as default — known to have data
            png_bytes, wavelength_um = await fetch_hips_channel_png(url, 0)
            return Response(
                content=png_bytes,
                media_type="image/png",
                headers={
                    "X-Wavelength-Um": f"{wavelength_um:.4f}",
                    "X-Source": "SPHEREx-DR1-HiPS-S3",
                    "X-Channel-Index": "0",
                },
            )
        except Exception as hips_exc:
            logger.error("HiPS channel extraction failed: %s", hips_exc)
            raise HTTPException(
                status_code=502,
                detail=f"HiPS cube image extraction failed: {hips_exc}"
            ) from hips_exc

    # ── Standard IRSA / S3 cutout (level2 individual files) ──────────────────
    # Try the requested URL first
    try:
        hdul = await irsa_svc.fetch_cutout_fits(url, redis_client=redis)
    except Exception as primary_exc:
        primary_msg = str(primary_exc)
        logger.warning("Primary cutout URL failed: %s", primary_msg[:80])

        # If we have coordinates, try other epochs for the same field
        if ra is not None and dec is not None:
            try:
                rows = await irsa_svc.query_spherex_obscore(ra, dec, 0.5)
                cutouts = irsa_svc.build_cutout_info_list(rows, anomaly_lookup)
                # Try each URL, skipping the one that already failed
                for cutout in cutouts:
                    if cutout.cutout_url == url:
                        continue
                    fallback_url = cutout.cutout_url.replace("size=0.5d", "size=0.1d")
                    try:
                        hdul = await irsa_svc.fetch_cutout_fits(fallback_url, redis_client=redis)
                        logger.info("Fallback cutout succeeded: %s", fallback_url[:60])
                        break
                    except Exception:
                        continue
            except Exception as fallback_exc:
                logger.warning("Fallback search also failed: %s", fallback_exc)

        if hdul is None:
            detail = primary_msg
            if "503" in detail:
                detail = (
                    "IRSA is temporarily returning 503 for this file (server overload on recent data). "
                    "Try clicking a different epoch chip, or wait a few minutes and reload the Sky Card."
                )
            elif "404" in detail:
                detail = (
                    "This file no longer exists at IRSA (the weekly data release may have changed). "
                    "Click 'Fetch Sky Card' again to get fresh URLs, then click an epoch chip."
                )
            raise HTTPException(status_code=502, detail=detail) from primary_exc

    try:
        image_data = hdul["IMAGE"].data
        if image_data is None:
            raise ValueError("IMAGE extension has no data")
        while image_data.ndim > 2:
            image_data = image_data[0]
        image_data = np.nan_to_num(image_data.astype(np.float64), nan=0.0)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    interval = ZScaleInterval()
    vmin, vmax = interval.get_limits(image_data)
    stretched = np.clip((image_data - vmin) / (vmax - vmin + 1e-10), 0, 1)
    pixel_array = (stretched * 255).astype(np.uint8)

    from PIL import Image  # noqa: PLC0415
    img = Image.fromarray(pixel_array, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@router.get(
    "/blink",
    summary="Blink-ready aligned PNG frames",
    response_model=list[dict],
)
async def sky_blink(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    size: float = Query(settings.default_cutout_size_deg, ge=0.001, le=0.5),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
    anomaly_lookup: AnomalyLookup = ...,  # type: ignore[assignment]
) -> list[dict]:
    """Return metadata for a sequence of aligned PNG frames for blink comparison.

    Queries IRSA for all epochs at the given position, downloads and aligns
    them to a common WCS grid, then returns a list of objects each containing
    an epoch timestamp, OBSID, anomaly flags, and a ``cutout_url`` the client
    should use to fetch the PNG via ``GET /sky/cutout?url=…``.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        size: Cutout size in degrees.
        redis: Injected Redis client.
        anomaly_lookup: Injected anomaly lookup.

    Returns:
        List of dicts describing each epoch frame.
    """
    try:
        rows = await irsa_svc.query_spherex_obscore(ra, dec, size)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"IRSA TAP query failed: {exc}") from exc

    if not rows:
        return []

    cutouts = irsa_svc.build_cutout_info_list(rows, anomaly_lookup)
    return [
        {
            "obsid": c.obsid,
            "bandpass_id": c.bandpass_id,
            "epoch_timestamp": c.epoch_timestamp.isoformat() if c.epoch_timestamp else None,
            "cutout_url": c.cutout_url,
            "anomaly_flags": [f.model_dump() for f in c.anomaly_flags],
        }
        for c in cutouts
    ]


@router.get(
    "/flags",
    summary="FLAGS bitmask for a cutout",
)
async def sky_flags(
    url: str = Query(..., description="IRSA cutout URL"),
    full_mask: bool = Query(
        False,
        description="Include the full 2-D bad_pixel_mask array (can be large — only use programmatically)",
    ),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
) -> dict:
    """Return the decoded FLAGS bitmask for a cutout.

    By default returns only the summary (flag name → pixel count) and the
    mask shape.  Set ``full_mask=true`` to include the full 2-D array,
    which the frontend renders as a semi-transparent overlay.

    Args:
        url: IRSA cutout URL.
        full_mask: Whether to include the full pixel-level mask in the response.
        redis: Injected Redis client.

    Returns:
        Dict with ``"summary"``, ``"mask_shape"``, and optionally ``"bad_pixel_mask"``.
    """
    try:
        hdul = await irsa_svc.fetch_cutout_fits(url, redis_client=redis)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    flags_arr = extract_flags_from_hdul(hdul)
    if flags_arr is None:
        return {"summary": {}, "mask_shape": "unavailable", "bad_pixel_mask": []}

    from app.services.flags import flags_summary, bad_pixel_mask  # noqa: PLC0415
    import numpy as np  # noqa: PLC0415

    summary = flags_summary(flags_arr)
    mask = bad_pixel_mask(flags_arr)
    ny, nx = mask.shape

    result: dict = {
        "summary": summary,
        "mask_shape": f"{ny} × {nx}",
        "total_bad_pixels": int(mask.sum()),
        "total_pixels": int(ny * nx),
        "bad_pixel_fraction": round(float(mask.sum()) / (ny * nx), 4),
    }

    if full_mask:
        result["bad_pixel_mask"] = mask.astype(np.uint8).tolist()

    return result
