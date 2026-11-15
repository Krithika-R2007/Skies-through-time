"""NEOSSat observation endpoints.

GET /neossat/cone — NEOSSat asteroid/space-debris observations near a position.
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.neossat import NEOSSatObservation, neossat_cone_search

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/neossat", tags=["neossat"])


class NEOSSatObsSchema(BaseModel):
    """NEOSSat observation record for the API response."""

    obs_id: str
    ra: float
    dec: float
    start_time: datetime | None
    exposure_time_s: float | None
    target_name: str | None
    instrument: str
    access_url: str | None
    fits_download_url: str | None
    """Direct CADC FITS package download URL for this observation."""


@router.get(
    "/cone",
    response_model=list[NEOSSatObsSchema],
    summary="NEOSSat observations near a sky position",
)
async def neossat_cone(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Centre RA (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Centre Dec (degrees)"),
    radius: float = Query(0.5, ge=0.01, le=5.0, description="Search radius (degrees)"),
    limit: int = Query(50, ge=1, le=200),
) -> list[NEOSSatObsSchema]:
    """Return NEOSSat observations near a sky position from CADC.

    Used to flag fast-moving SPHEREx detections as potential asteroids or
    space debris observed by Canada's NEOSSat satellite.

    Args:
        ra: Centre RA in degrees.
        dec: Centre Dec in degrees.
        radius: Search radius in degrees (use larger values for fast movers).
        limit: Maximum observations to return.

    Returns:
        List of NEOSSat observations, most recent first.
    """
    try:
        obs = await neossat_cone_search(ra, dec, radius, limit=limit)
        return [
            NEOSSatObsSchema(
                obs_id=o.obs_id,
                ra=o.ra,
                dec=o.dec,
                start_time=o.start_time,
                exposure_time_s=o.exposure_time_s,
                target_name=o.target_name,
                instrument=o.instrument,
                access_url=o.access_url,
                fits_download_url=o.fits_download_url,
            )
            for o in obs
        ]
    except Exception as exc:
        logger.error("NEOSSat cone search failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"CADC NEOSSat query failed: {exc}",
        ) from exc
