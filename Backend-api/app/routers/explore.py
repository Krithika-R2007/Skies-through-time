"""Explore endpoints — HEALPix coverage, channel images, comparison, change detection.

GET /explore/healpix   — sky coverage tiles for the interactive map
GET /explore/channel   — single spectral channel PNG image
GET /explore/compare   — side-by-side epoch comparison + diff image
GET /explore/changes   — change detection across all epochs
"""

from __future__ import annotations

import io
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from app.config import settings
from app.dependencies import AnomalyLookup, OptionalRedis
from app.services import irsa as irsa_svc
from app.services.channel import channel_metadata, extract_channel_image
from app.services.compare import compare_epochs, multi_epoch_changes
from app.services.difference import DifferenceCandidate
from app.services.healpix import viewport_to_healpix

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/explore", tags=["explore"])


# ── HEALPix coverage ─────────────────────────────────────────────────────────


class HEALPixResponse(BaseModel):
    """HEALPix coverage data for a sky viewport."""

    nside: int
    n_pixels: int
    pixels: list[int]
    ra_centres: list[float]
    dec_centres: list[float]


@router.get(
    "/healpix",
    response_model=HEALPixResponse,
    summary="HEALPix sky coverage tiles for viewport",
)
async def healpix_coverage(
    ra_min: float = Query(..., ge=0.0, lt=360.0),
    ra_max: float = Query(..., ge=0.0, le=360.0),
    dec_min: float = Query(..., ge=-90.0, le=90.0),
    dec_max: float = Query(..., ge=-90.0, le=90.0),
    nside: int = Query(64, description="HEALPix resolution (power of 2, 32–256)"),
) -> HEALPixResponse:
    """Return HEALPix pixel IDs and centres covering a sky viewport.

    The frontend sky map calls this when the user pans or zooms to get the
    list of pixels to render as a coverage heatmap.

    Args:
        ra_min: Left RA edge of viewport in degrees.
        ra_max: Right RA edge of viewport in degrees.
        dec_min: Bottom Dec edge of viewport in degrees.
        dec_max: Top Dec edge of viewport in degrees.
        nside: HEALPix resolution — 64 gives ~0.9 sq deg pixels.

    Returns:
        HEALPix pixel IDs and their sky coordinates.
    """
    if nside not in (32, 64, 128, 256):
        raise HTTPException(status_code=422, detail="nside must be 32, 64, 128, or 256")

    coverage = viewport_to_healpix(ra_min, ra_max, dec_min, dec_max, nside=nside)
    return HEALPixResponse(
        nside=coverage.nside,
        n_pixels=coverage.n_pixels,
        pixels=coverage.pixels,
        ra_centres=coverage.ra_centres,
        dec_centres=coverage.dec_centres,
    )


# ── Spectral channel image ────────────────────────────────────────────────────


@router.get(
    "/channel",
    response_class=Response,
    summary="Single spectral channel PNG image",
    responses={200: {"content": {"image/png": {}}}},
)
async def channel_image(
    url: str = Query(..., description="IRSA cutout URL (from /sky/card)"),
    channel: int = Query(..., ge=0, le=101, description="Spectral channel index (0–101)"),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
) -> Response:
    """Return a PNG image for one specific SPHEREx spectral channel.

    Powers the 102-channel wavelength slider — when the user drags it,
    the frontend calls this endpoint for each new channel position.

    Args:
        url: IRSA cutout URL or HiPS S3 URL.
        channel: Spectral channel (0 = 0.75 μm, 101 = 5.0 μm).
        redis: Optional Redis cache.

    Returns:
        PNG image with wavelength in the ``X-Wavelength-Um`` response header.
    """
    # HiPS cube: use range-based extraction
    if "hips5_cube" in url or ("s3.amazonaws.com" in url and "_cube.fits" in url):
        try:
            from app.services.hips_image import fetch_hips_channel_png  # noqa: PLC0415
            png_bytes, wavelength_um = await fetch_hips_channel_png(url, channel)
            return Response(
                content=png_bytes,
                media_type="image/png",
                headers={
                    "X-Wavelength-Um": f"{wavelength_um:.4f}",
                    "X-Channel-Index": str(channel),
                },
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    try:
        hdul = await irsa_svc.fetch_cutout_fits(url, redis_client=redis)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    try:
        pixel_array, wavelength_um = extract_channel_image(hdul, channel)
    except (ValueError, IndexError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    from PIL import Image  # noqa: PLC0415

    img = Image.fromarray(pixel_array, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={
            "X-Wavelength-Um": f"{wavelength_um:.4f}",
            "X-Channel-Index": str(channel),
        },
    )


@router.get(
    "/channel/metadata",
    summary="Wavelength for all 102 channels",
)
async def channel_metadata_endpoint(
    url: str = Query(..., description="IRSA cutout URL"),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
) -> list[dict]:
    """Return the wavelength in μm for each of the 102 SPHEREx channels.

    Call this once when a cutout is loaded to build the wavelength axis
    for the channel slider.

    Args:
        url: IRSA cutout URL or HiPS S3 URL.
        redis: Optional Redis cache.

    Returns:
        List of ``{"channel": int, "wavelength_um": float}`` dicts.
    """
    # HiPS cube: return pre-computed wavelength grid instantly, no download
    if "hips5_cube" in url or ("s3.amazonaws.com" in url and "_cube.fits" in url):
        from app.services.hips_image import hips_channel_metadata  # noqa: PLC0415
        return await hips_channel_metadata(url)

    try:
        hdul = await irsa_svc.fetch_cutout_fits(url, redis_client=redis)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return channel_metadata(hdul)


# ── Two-epoch comparison ──────────────────────────────────────────────────────


class ChangeCandidate(BaseModel):
    """A detected change between two epochs."""

    ra: float
    dec: float
    x_pix: float
    y_pix: float
    snr: float
    dipole_score: float
    is_moving_candidate: bool


class CompareResponse(BaseModel):
    """Response from the two-epoch comparison endpoint."""

    obsid_a: str
    obsid_b: str
    n_changes: int
    change_candidates: list[ChangeCandidate]
    png_a_url: str
    png_b_url: str
    png_diff_url: str


# Store comparison PNGs in memory keyed by obsid pair (simple in-process cache)
_compare_cache: dict[str, bytes] = {}


@router.get(
    "/compare",
    response_model=CompareResponse,
    summary="Side-by-side epoch comparison with diff image",
)
async def compare(
    url_a: str = Query(..., description="Cutout URL for epoch A (reference/older)"),
    url_b: str = Query(..., description="Cutout URL for epoch B (science/newer)"),
    obsid_a: str = Query("epoch_a", description="OBSID for epoch A"),
    obsid_b: str = Query("epoch_b", description="OBSID for epoch B"),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
) -> CompareResponse:
    """Compare two SPHEREx epochs: aligned PNGs + colour difference image + change list.

    Downloads and aligns both epochs, produces three images:
    - Epoch A (greyscale PNG)
    - Epoch B (greyscale PNG)
    - Difference B−A (colour: blue=brighter in B, red=fainter in B)

    Also detects and returns positions of significant changes.

    Args:
        url_a: IRSA cutout URL for the reference (older) epoch.
        url_b: IRSA cutout URL for the science (newer) epoch.
        obsid_a: Label for epoch A.
        obsid_b: Label for epoch B.
        redis: Optional Redis cache.

    Returns:
        CompareResponse with image URLs and change candidates.
    """
    try:
        hdul_a = await irsa_svc.fetch_cutout_fits(url_a, redis_client=redis)
        hdul_b = await irsa_svc.fetch_cutout_fits(url_b, redis_client=redis)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cutout download failed: {exc}") from exc

    result = await compare_epochs(hdul_a, hdul_b, obsid_a, obsid_b)

    # Cache PNGs in memory for retrieval via /explore/compare/image
    _compare_cache[f"{obsid_a}_a"] = result.png_a
    _compare_cache[f"{obsid_a}_b"] = result.png_b
    _compare_cache[f"{obsid_a}_diff"] = result.png_diff

    base = "/explore/compare/image"
    return CompareResponse(
        obsid_a=result.obsid_a,
        obsid_b=result.obsid_b,
        n_changes=result.n_changes,
        change_candidates=[
            ChangeCandidate(
                ra=c.ra, dec=c.dec, x_pix=c.x_pix, y_pix=c.y_pix,
                snr=c.snr, dipole_score=c.dipole_score,
                is_moving_candidate=c.is_moving_candidate,
            )
            for c in result.change_candidates
        ],
        png_a_url=f"{base}?key={obsid_a}_a",
        png_b_url=f"{base}?key={obsid_a}_b",
        png_diff_url=f"{base}?key={obsid_a}_diff",
    )


@router.get(
    "/compare/image",
    response_class=Response,
    summary="Retrieve a cached comparison PNG",
    responses={200: {"content": {"image/png": {}}}},
)
async def compare_image(key: str = Query(...)) -> Response:
    """Retrieve a cached comparison PNG by key.

    Keys are returned in the CompareResponse from ``GET /explore/compare``.

    Args:
        key: Image cache key from a prior compare call.

    Returns:
        PNG image bytes.
    """
    png = _compare_cache.get(key)
    if png is None:
        raise HTTPException(status_code=404, detail="Image not found or expired. Run compare again.")
    return Response(content=png, media_type="image/png")


# ── Multi-epoch change detection ──────────────────────────────────────────────


@router.get(
    "/changes",
    response_model=list[ChangeCandidate],
    summary="Change detection across all available epochs",
)
async def sky_changes(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    size: float = Query(0.05, ge=0.01, le=0.2),
    detection_threshold: float = Query(4.0, ge=2.0, le=8.0),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
    anomaly_lookup: AnomalyLookup = ...,  # type: ignore[assignment]
) -> list[ChangeCandidate]:
    """Detect sky positions that changed between any two consecutive SPHEREx epochs.

    Downloads all available epochs, runs pairwise difference imaging, and
    returns a merged, de-duplicated list of positions with significant changes.

    Positions where the dipole score is high indicate moving objects.
    Positions where flux changed symmetrically indicate variable sources.

    Args:
        ra: Field RA in degrees.
        dec: Field Dec in degrees.
        size: Cutout size in degrees (keep ≤ 0.1 for speed).
        detection_threshold: Sigma threshold for change detection.
        redis: Optional Redis cache.
        anomaly_lookup: Anomaly lookup for filtering bad observations.

    Returns:
        List of ChangeCandidate objects sorted by |dipole_score|.
    """
    import asyncio  # noqa: PLC0415

    try:
        rows = await irsa_svc.query_spherex_obscore(ra, dec, size)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"IRSA TAP query failed: {exc}") from exc

    if len(rows) < 2:
        return []

    cutouts = irsa_svc.build_cutout_info_list(rows, anomaly_lookup)

    # Download all cutouts concurrently
    hduls_raw = await asyncio.gather(
        *[irsa_svc.fetch_cutout_fits(c.cutout_url, redis_client=redis) for c in cutouts],
        return_exceptions=True,
    )

    hduls = [h for h in hduls_raw if not isinstance(h, Exception)]
    obsids = [c.obsid for c, h in zip(cutouts, hduls_raw) if not isinstance(h, Exception)]

    if len(hduls) < 2:
        raise HTTPException(status_code=502, detail="Not enough cutouts downloaded")

    candidates = await multi_epoch_changes(
        hduls, obsids, detection_threshold=detection_threshold
    )

    return [
        ChangeCandidate(
            ra=c.ra, dec=c.dec, x_pix=c.x_pix, y_pix=c.y_pix,
            snr=c.snr, dipole_score=c.dipole_score,
            is_moving_candidate=c.is_moving_candidate,
        )
        for c in candidates
    ]
