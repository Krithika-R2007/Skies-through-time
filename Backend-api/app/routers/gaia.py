"""Gaia DR3 catalogue endpoints.

GET /gaia/cone        — all known stars in a cone
GET /gaia/crossmatch  — nearest Gaia source to a clicked position
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.gaia import GaiaSource, gaia_cone_search, gaia_crossmatch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/gaia", tags=["gaia"])


class GaiaSourceSchema(BaseModel):
    """Gaia DR3 source record for the API response."""

    source_id: str
    ra: float
    dec: float
    pmra: float | None
    pmdec: float | None
    phot_g_mean_mag: float | None
    parallax: float | None
    distance_pc: float | None
    proper_motion_mas_yr: float | None


def _to_schema(s: GaiaSource) -> GaiaSourceSchema:
    return GaiaSourceSchema(
        source_id=s.source_id,
        ra=s.ra,
        dec=s.dec,
        pmra=s.pmra,
        pmdec=s.pmdec,
        phot_g_mean_mag=s.phot_g_mean_mag,
        parallax=s.parallax,
        distance_pc=s.distance_pc,
        proper_motion_mas_yr=s.proper_motion_mas_yr,
    )


@router.get(
    "/cone",
    response_model=list[GaiaSourceSchema],
    summary="Known stars in a cone from Gaia DR3",
)
async def gaia_cone(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Centre RA (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Centre Dec (degrees)"),
    radius: float = Query(0.1, ge=0.001, le=1.0, description="Search radius (degrees)"),
    limit: int = Query(200, ge=1, le=1000, description="Max sources to return"),
) -> list[GaiaSourceSchema]:
    """Return known Gaia DR3 stars in a cone around a sky position.

    Used by the frontend to overlay labelled star markers on the sky image.

    Args:
        ra: Centre Right Ascension in degrees.
        dec: Centre Declination in degrees.
        radius: Search radius in degrees.
        limit: Maximum number of sources.

    Returns:
        List of Gaia sources sorted by brightness (brightest first).
    """
    try:
        sources = await gaia_cone_search(ra, dec, radius, limit=limit)
        return [_to_schema(s) for s in sources]
    except Exception as exc:
        logger.error("Gaia cone search failed: %s", exc)
        # Return empty list rather than 503 — star overlay is non-fatal
        return []


@router.get(
    "/crossmatch",
    response_model=GaiaSourceSchema | None,
    summary="Nearest Gaia DR3 source to a sky position",
)
async def gaia_xmatch(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Target RA (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Target Dec (degrees)"),
    radius_arcsec: float = Query(5.0, ge=0.1, le=60.0, description="Search radius (arcsec)"),
) -> GaiaSourceSchema | None:
    """Find the nearest Gaia DR3 source to a clicked sky position.

    Used to populate the object info panel when a user clicks on a source.
    Returns null if no Gaia source is found within the search radius.

    Args:
        ra: Target RA in degrees.
        dec: Target Dec in degrees.
        radius_arcsec: Search radius in arcseconds.

    Returns:
        Nearest GaiaSource or null.
    """
    try:
        source = await gaia_crossmatch(ra, dec, radius_arcsec)
        return _to_schema(source) if source else None
    except Exception as exc:
        logger.error("Gaia crossmatch failed: %s", exc)
        # Return null rather than 503 — crossmatch is non-fatal
        return None


class ClassificationResponse(BaseModel):
    """Source classification result."""
    ra: float
    dec: float
    is_known: bool
    candidate_type: str
    confidence: float
    narrative: str
    separation_arcsec: float | None
    gaia_source_id: str | None
    gaia_proper_motion_mas_yr: float | None
    gaia_distance_pc: float | None


@router.get(
    "/classify",
    response_model=ClassificationResponse,
    summary="Classify a source as known star or candidate discovery",
)
async def classify_source(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Source RA (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Source Dec (degrees)"),
    match_radius_arcsec: float = Query(5.0, ge=0.5, le=30.0, description="Gaia match radius (arcsec)"),
    proper_motion_arcsec_yr: float = Query(None, ge=0.0, description="Measured proper motion from /motion/detect (arcsec/yr)"),
) -> ClassificationResponse:
    """Cross-match a source against Gaia DR3 and classify it.

    This is the core citizen science feature — it answers the question
    'Is this a known star, or could it be a new discovery?'

    - Known star → labelled with Gaia ID, magnitude, distance
    - Known fast mover → flagged as a high proper-motion star worth monitoring
    - No Gaia match + motion → candidate solar system object
    - No Gaia match + stationary → candidate brown dwarf or galaxy

    Args:
        ra: Source RA in degrees.
        dec: Source Dec in degrees.
        match_radius_arcsec: Gaia cross-match radius.
        proper_motion_arcsec_yr: Proper motion from SPHEREx motion detection.

    Returns:
        ClassificationResponse with candidate_type and narrative.
    """
    from app.services.gaia import classify_spherex_source  # noqa: PLC0415

    result = await classify_spherex_source(
        ra, dec,
        match_radius_arcsec=match_radius_arcsec,
        proper_motion_arcsec_yr=proper_motion_arcsec_yr,
    )
    return ClassificationResponse(
        ra=result.ra,
        dec=result.dec,
        is_known=result.is_known,
        candidate_type=result.candidate_type,
        confidence=result.confidence,
        narrative=result.narrative,
        separation_arcsec=result.separation_arcsec,
        gaia_source_id=result.gaia_source.source_id if result.gaia_source else None,
        gaia_proper_motion_mas_yr=result.gaia_source.proper_motion_mas_yr if result.gaia_source else None,
        gaia_distance_pc=result.gaia_source.distance_pc if result.gaia_source else None,
    )
