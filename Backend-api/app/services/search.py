"""Name / coordinate resolution service."""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

try:
    from astropy.coordinates import SkyCoord
    import astropy.units as u
    _ASTROPY_OK = True
except ImportError:
    _ASTROPY_OK = False

try:
    from astroquery.gaia import Gaia  # type: ignore[import]
    _ASTROQUERY_OK = True
except ImportError:
    _ASTROQUERY_OK = False


@dataclass
class SearchResult:
    query: str
    ra: float
    dec: float
    name: str | None
    object_type: str | None
    source: str
    gaia_source_id: str | None = None


def _try_parse_coords(q: str) -> tuple[float, float] | None:
    """Try to parse 'ra, dec' or 'ra dec' into floats."""
    text = q.strip().replace(",", " ")
    parts = text.split()
    if len(parts) == 2:
        try:
            ra, dec = float(parts[0]), float(parts[1])
            if 0.0 <= ra < 360.0 and -90.0 <= dec <= 90.0:
                return ra, dec
        except ValueError:
            pass
    return None


def _simbad_lookup(name: str) -> tuple[float, float] | None:
    """Blocking SIMBAD / astropy name lookup — run in a thread."""
    if not _ASTROPY_OK:
        return None
    try:
        coord = SkyCoord.from_name(name)
        return float(coord.ra.deg), float(coord.dec.deg)
    except Exception as exc:
        logger.debug("SIMBAD lookup failed for %r: %s", name, exc)
        return None


def _gaia_id_lookup(source_id: str) -> tuple[float, float, str] | None:
    """Blocking Gaia DR3 source-ID lookup — run in a thread."""
    if not _ASTROQUERY_OK:
        return None
    try:
        query = (
            f"SELECT ra, dec FROM gaiadr3.gaia_source "
            f"WHERE source_id = {source_id} LIMIT 1"
        )
        job = Gaia.launch_job(query)
        results = job.get_results()
        if len(results) == 0:
            return None
        return float(results["ra"][0]), float(results["dec"][0]), source_id
    except Exception as exc:
        logger.debug("Gaia ID lookup failed for %r: %s", source_id, exc)
        return None


async def resolve_search(q: str) -> SearchResult | None:
    """Resolve a user query to sky coordinates.

    Strategy:
    1. Try direct coordinate parsing (instant).
    2. Try Gaia DR3 source ID pattern.
    3. Try SIMBAD name lookup.
    """
    q = q.strip()

    # 1. Coordinate parsing
    coords = _try_parse_coords(q)
    if coords:
        return SearchResult(
            query=q,
            ra=coords[0],
            dec=coords[1],
            name=None,
            object_type="coordinates",
            source="user_input",
        )

    loop = asyncio.get_running_loop()

    # 2. Gaia DR3 source ID: "DR3 <number>" or just a large integer
    gaia_match = re.match(r"(?:DR3\s+)?(\d{10,20})", q, re.IGNORECASE)
    if gaia_match and _ASTROQUERY_OK:
        source_id = gaia_match.group(1)
        try:
            result = await loop.run_in_executor(None, _gaia_id_lookup, source_id)
            if result:
                ra, dec, sid = result
                return SearchResult(
                    query=q,
                    ra=ra,
                    dec=dec,
                    name=f"Gaia DR3 {sid}",
                    object_type="star",
                    source="gaia_dr3",
                    gaia_source_id=sid,
                )
        except Exception as exc:
            logger.warning("Gaia ID lookup error: %s", exc)

    # 3. SIMBAD name resolution
    if _ASTROPY_OK:
        try:
            result_coords = await loop.run_in_executor(None, _simbad_lookup, q)
            if result_coords:
                return SearchResult(
                    query=q,
                    ra=result_coords[0],
                    dec=result_coords[1],
                    name=q,
                    object_type="simbad_object",
                    source="simbad",
                )
        except Exception as exc:
            logger.warning("SIMBAD resolution error: %s", exc)

    return None
