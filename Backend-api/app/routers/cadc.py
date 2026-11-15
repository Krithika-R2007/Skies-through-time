"""CADC multi-telescope observation endpoints.

GET /cadc/observations — observations from a single CADC collection near a sky position.
GET /cadc/collections  — observation counts across all four supported collections.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.cadc import SUPPORTED_COLLECTIONS, CADCObservation, cadc_cone_search

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cadc", tags=["cadc"])

# Collections accepted by /cadc/observations
CollectionChoice = Literal["HST", "JWST", "GEMINI", "NEOSSAT", "ALL"]

# Per-collection timeout used by /cadc/collections (seconds)
_COLLECTION_TIMEOUT_S = 30.0


class CADCObsSchema(BaseModel):
    """CADC observation record returned by the API."""

    obs_id: str
    collection: str
    target_name: str | None
    data_product_type: str | None
    calibration_level: int | None
    time_start: datetime | None
    time_end: datetime | None
    exposure_time_s: float | None
    position_bounds: str | None


def _to_schema(obs: CADCObservation) -> CADCObsSchema:
    """Convert a :class:`~app.services.cadc.CADCObservation` to its API schema."""
    return CADCObsSchema(
        obs_id=obs.obs_id,
        collection=obs.collection,
        target_name=obs.target_name,
        data_product_type=obs.data_product_type,
        calibration_level=obs.calibration_level,
        time_start=obs.time_start,
        time_end=obs.time_end,
        exposure_time_s=obs.exposure_time_s,
        position_bounds=obs.position_bounds,
    )


@router.get(
    "/observations",
    response_model=list[CADCObsSchema],
    summary="Multi-telescope observations from CADC",
)
async def cadc_observations(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Centre RA (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Centre Dec (degrees)"),
    radius: float = Query(0.5, ge=0.01, le=5.0, description="Search radius (degrees)"),
    collection: CollectionChoice = Query(
        "ALL",
        description=(
            "CADC collection to query. Use 'ALL' to search HST, JWST, GEMINI, "
            "and NEOSSAT simultaneously and return combined results."
        ),
    ),
    limit: int = Query(50, ge=1, le=200, description="Max results per collection"),
) -> list[CADCObsSchema]:
    """Return observations near a sky position from one or all CADC collections.

    When *collection* is ``'ALL'`` the four supported collections (HST, JWST,
    GEMINI, NEOSSAT) are queried concurrently and their results merged.

    Args:
        ra: Centre RA in degrees.
        dec: Centre Dec in degrees.
        radius: Search radius in degrees.
        collection: Collection name or ``'ALL'``.
        limit: Maximum rows per collection.

    Returns:
        List of :class:`CADCObsSchema` records sorted most-recent first within
        each collection.
    """
    try:
        if collection == "ALL":
            tasks = [
                cadc_cone_search(ra, dec, radius, col, limit=limit)
                for col in SUPPORTED_COLLECTIONS
            ]
            results_nested: list[list[CADCObservation]] = await asyncio.gather(*tasks)
            merged: list[CADCObservation] = [
                obs for batch in results_nested for obs in batch
            ]
            return [_to_schema(o) for o in merged]

        obs_list = await cadc_cone_search(ra, dec, radius, collection, limit=limit)
        return [_to_schema(o) for o in obs_list]

    except Exception as exc:
        logger.error("CADC observations endpoint failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"CADC query failed: {exc}",
        ) from exc


@router.get(
    "/collections",
    response_model=dict[str, int],
    summary="Which telescopes have observed this field",
)
async def cadc_collections(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Centre RA (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Centre Dec (degrees)"),
    radius: float = Query(0.5, ge=0.01, le=5.0, description="Search radius (degrees)"),
    limit: int = Query(
        50,
        ge=1,
        le=200,
        description="Max results fetched per collection (used for counting)",
    ),
) -> dict[str, int]:
    """Return the observation count for each CADC collection near a sky position.

    Queries HST, JWST, GEMINI, and NEOSSAT concurrently (each with a
    :data:`_COLLECTION_TIMEOUT_S`-second timeout) and returns a mapping of
    collection name to observation count.

    Collections that time out or fail return a count of ``0``.

    Args:
        ra: Centre RA in degrees.
        dec: Centre Dec in degrees.
        radius: Search radius in degrees.
        limit: Maximum rows fetched per collection (determines upper bound on count).

    Returns:
        Dict mapping each collection name to its observation count.
    """

    async def _fetch_with_timeout(col: str) -> tuple[str, int]:
        """Fetch *col* with a hard timeout; return ``(col, 0)`` on failure."""
        try:
            results = await asyncio.wait_for(
                cadc_cone_search(ra, dec, radius, col, limit=limit),
                timeout=_COLLECTION_TIMEOUT_S,
            )
            return col, len(results)
        except asyncio.TimeoutError:
            logger.warning(
                "CADC %s timed out after %.0fs for ra=%.4f dec=%.4f",
                col,
                _COLLECTION_TIMEOUT_S,
                ra,
                dec,
            )
            return col, 0
        except Exception as exc:
            logger.warning("CADC %s count query failed: %s", col, exc)
            return col, 0

    pairs: list[tuple[str, int]] = await asyncio.gather(
        *[_fetch_with_timeout(col) for col in SUPPORTED_COLLECTIONS]
    )
    return dict(pairs)
