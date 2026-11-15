"""Search and navigation endpoints.

GET /search?q=  — resolve a name, Gaia ID, or coordinates to a sky position.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.search import SearchResult, resolve_search

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])


class SearchResponse(BaseModel):
    """Resolved search result returned to the frontend."""

    query: str
    ra: float
    dec: float
    name: str | None
    object_type: str | None
    source: str
    gaia_source_id: str | None = None


@router.get("", response_model=SearchResponse, summary="Resolve object name or coordinates")
async def search(
    q: str = Query(..., min_length=1, description="Object name, Gaia DR3 ID, or 'RA,Dec' coordinates"),
) -> SearchResponse:
    """Resolve a search query to sky coordinates.

    Accepts:
    - Common names: ``Barnard's Star``, ``M31``, ``Andromeda``
    - Gaia DR3 source IDs: ``DR3 4472832130942575872``
    - Raw coordinates: ``269.452, 4.6934`` or ``269.452 4.6934``

    Strategy: tries coordinates first (instant), then Gaia ID, then SIMBAD.

    Args:
        q: User search string.

    Returns:
        Resolved sky position with metadata.

    Raises:
        HTTPException 404: If the query cannot be resolved.
    """
    result: SearchResult | None = await resolve_search(q)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Could not resolve '{q}'. Try a different name or enter coordinates directly.",
        )
    return SearchResponse(
        query=result.query,
        ra=result.ra,
        dec=result.dec,
        name=result.name,
        object_type=result.object_type,
        source=result.source,
        gaia_source_id=result.gaia_source_id,
    )
