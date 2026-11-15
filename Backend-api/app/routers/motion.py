"""Motion detection and ghost prediction endpoints.

GET /motion/detect  – find moving objects in a SPHEREx field
GET /motion/ghost   – predict a source's next-epoch position
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from functools import partial

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.dependencies import AnomalyLookup, OptionalRedis
from app.schemas.motion import GhostPrediction, MotionResponse, MovingSource, EpochPosition
from app.services import irsa as irsa_svc
from app.services.align import align_epochs
from app.services.detect import detect_sources
from app.services.motion import find_moving_sources
from app.services.predict import predict_ghost

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/motion", tags=["motion"])


def _matched_to_schema(ms, epoch_ts_map: dict[int, datetime]) -> MovingSource:
    """Convert a MatchedSource dataclass to a MovingSource schema."""
    positions = []
    for i, (ei, x, y, ra, dec, flux, snr) in enumerate(
        zip(
            ms.epoch_indices,
            ms.x_pix_list,
            ms.y_pix_list,
            ms.ra_list,
            ms.dec_list,
            ms.flux_list,
            ms.snr_list,
        )
    ):
        positions.append(
            EpochPosition(
                epoch=ms.timestamps[i],
                x_pix=x,
                y_pix=y,
                ra=ra,
                dec=dec,
                flux=flux,
                snr=snr,
            )
        )
    return MovingSource(
        source_id=ms.source_id,
        ra_initial=ms.ra_initial,
        dec_initial=ms.dec_initial,
        positions=positions,
        vx_arcsec_yr=ms.vx_arcsec_yr,
        vy_arcsec_yr=ms.vy_arcsec_yr,
        vx_err=ms.vx_err,
        vy_err=ms.vy_err,
        proper_motion_arcsec_yr=ms.proper_motion_arcsec_yr,
        n_epochs=ms.n_epochs,
        snr=ms.snr,
    )


@router.get("/detect", response_model=MotionResponse, summary="Detect moving objects")
async def detect_motion(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Right Ascension (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Declination (degrees)"),
    size: float = Query(settings.default_cutout_size_deg, ge=0.001, le=0.5),
    min_proper_motion: float = Query(
        0.5, ge=0.0, description="Minimum proper motion (arcsec/yr) to report"
    ),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
    anomaly_lookup: AnomalyLookup = ...,  # type: ignore[assignment]
) -> MotionResponse:
    """Detect moving sources across all SPHEREx epochs at a position.

    Downloads and aligns all available epochs, runs source detection on
    each, cross-matches across epochs, and reports sources with significant
    proper motion.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        size: Cutout size / search radius in degrees.
        min_proper_motion: Proper-motion threshold in arcsec/year.
        redis: Redis client for FITS caching.
        anomaly_lookup: Anomaly lookup dict.

    Returns:
        MotionResponse with a list of moving sources.
    """
    # 1. Query IRSA for all epochs
    try:
        rows = await irsa_svc.query_spherex_obscore(ra, dec, size)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"IRSA TAP query failed: {exc}") from exc

    if len(rows) < 2:
        return MotionResponse(
            ra=ra,
            dec=dec,
            size_deg=size,
            moving_sources=[],
            n_sources_detected=0,
            n_moving=0,
        )

    cutouts = irsa_svc.build_cutout_info_list(rows, anomaly_lookup)

    # 2. Download all FITS cutouts (concurrent)
    async def _fetch(c):  # type: ignore[no-untyped-def]
        return await irsa_svc.fetch_cutout_fits(c.cutout_url, redis_client=redis)

    hduls = await asyncio.gather(*[_fetch(c) for c in cutouts], return_exceptions=True)

    # Filter out failed downloads
    good_hduls = []
    good_cutouts = []
    for hdul, cutout in zip(hduls, cutouts):
        if isinstance(hdul, Exception):
            logger.warning("Skipping cutout %s: %s", cutout.obsid, hdul)
            continue
        good_hduls.append(hdul)
        good_cutouts.append(cutout)

    if len(good_hduls) < 2:
        raise HTTPException(
            status_code=502, detail="Insufficient cutouts downloaded for motion detection"
        )

    # 3. Align epochs
    loop = asyncio.get_running_loop()
    aligned_epochs = await loop.run_in_executor(
        None,
        partial(
            align_epochs,
            good_hduls,
            [c.obsid for c in good_cutouts],
        ),
    )

    shared_wcs = aligned_epochs[0].wcs

    # 4. Detect sources in each aligned epoch
    timestamps = [
        c.epoch_timestamp or datetime.utcnow() for c in good_cutouts
    ]

    detections_by_epoch = await loop.run_in_executor(
        None,
        lambda: [
            detect_sources(ep.image, ep.epoch_index, shared_wcs)
            for ep in aligned_epochs
        ],
    )

    n_total = sum(len(d) for d in detections_by_epoch)

    # 5. Find moving sources
    moving = await loop.run_in_executor(
        None,
        partial(
            find_moving_sources,
            detections_by_epoch,
            timestamps,
            shared_wcs,
            min_proper_motion_arcsec_yr=min_proper_motion,
        ),
    )

    return MotionResponse(
        ra=ra,
        dec=dec,
        size_deg=size,
        moving_sources=[_matched_to_schema(ms, {}) for ms in moving],
        n_sources_detected=n_total,
        n_moving=len(moving),
    )


@router.get("/ghost", response_model=GhostPrediction, summary="Ghost position prediction")
async def ghost_prediction(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Right Ascension (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Declination (degrees)"),
    size: float = Query(settings.default_cutout_size_deg, ge=0.001, le=0.5),
    source_id: str = Query(..., description="Source ID from /motion/detect"),
    redis: OptionalRedis = ...,  # type: ignore[assignment]
    anomaly_lookup: AnomalyLookup = ...,  # type: ignore[assignment]
) -> GhostPrediction:
    """Return a ghost-marker prediction for a specific moving source.

    Runs the same motion detection pipeline as /motion/detect, then
    extracts and returns the prediction for the requested source_id.

    Args:
        ra: Field RA.
        dec: Field Dec.
        size: Cutout size.
        source_id: Source identifier from a prior /motion/detect call.
        redis: Redis client.
        anomaly_lookup: Anomaly lookup dict.

    Returns:
        GhostPrediction with predicted RA/Dec and confidence.
    """
    # Re-use the detect pipeline (caching means this is not expensive)
    motion_result = await detect_motion(
        ra=ra,
        dec=dec,
        size=size,
        min_proper_motion=0.0,
        redis=redis,
        anomaly_lookup=anomaly_lookup,
    )

    # Find the requested source
    matched = next(
        (s for s in motion_result.moving_sources if s.source_id == source_id), None
    )
    if matched is None:
        raise HTTPException(
            status_code=404, detail=f"Source '{source_id}' not found in this field"
        )

    # Build a temporary MatchedSource-like object for the predictor
    from app.services.motion import MatchedSource  # noqa: PLC0415

    ms = MatchedSource(
        source_id=matched.source_id,
        ra_initial=matched.ra_initial,
        dec_initial=matched.dec_initial,
        epoch_indices=list(range(matched.n_epochs)),
        timestamps=[p.epoch for p in matched.positions],
        x_pix_list=[p.x_pix for p in matched.positions],
        y_pix_list=[p.y_pix for p in matched.positions],
        ra_list=[p.ra for p in matched.positions],
        dec_list=[p.dec for p in matched.positions],
        flux_list=[p.flux for p in matched.positions],
        snr_list=[p.snr for p in matched.positions],
        vx_arcsec_yr=matched.vx_arcsec_yr,
        vy_arcsec_yr=matched.vy_arcsec_yr,
        vx_err=matched.vx_err,
        vy_err=matched.vy_err,
        proper_motion_arcsec_yr=matched.proper_motion_arcsec_yr,
        n_epochs=matched.n_epochs,
        snr=matched.snr,
    )

    result = predict_ghost(ms)

    return GhostPrediction(
        source_id=result.source_id,
        current_ra=result.current_ra,
        current_dec=result.current_dec,
        current_epoch=result.current_epoch,
        predicted_ra=result.predicted_ra,
        predicted_dec=result.predicted_dec,
        predicted_epoch=result.predicted_epoch,
        vx_arcsec_yr=result.vx_arcsec_yr,
        vy_arcsec_yr=result.vy_arcsec_yr,
        proper_motion_arcsec_yr=result.proper_motion_arcsec_yr,
        confidence=result.confidence,
        confidence_label=result.confidence_label,
        n_epochs_used=result.n_epochs_used,
        fit_residual_arcsec=result.fit_residual_arcsec,
    )
