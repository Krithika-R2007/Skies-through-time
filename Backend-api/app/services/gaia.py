"""Gaia DR3 catalogue query and source classification service."""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

_GAIA_TAP = "https://gea.esac.esa.int/tap-server/tap/sync"
_TIMEOUT = httpx.Timeout(30.0)


@dataclass
class GaiaSource:
    source_id: str
    ra: float
    dec: float
    pmra: float | None
    pmdec: float | None
    phot_g_mean_mag: float | None
    parallax: float | None
    distance_pc: float | None
    proper_motion_mas_yr: float | None


@dataclass
class ClassificationResult:
    ra: float
    dec: float
    is_known: bool
    candidate_type: str
    confidence: float
    narrative: str
    separation_arcsec: float | None
    gaia_source: GaiaSource | None


def _parse_rows(text: str) -> list[dict]:
    """Parse a simple VOTable CSV-ish response from Gaia TAP."""
    lines = text.strip().splitlines()
    if len(lines) < 2:
        return []
    header = [h.strip() for h in lines[0].split(",")]
    rows = []
    for line in lines[1:]:
        values = [v.strip() for v in line.split(",")]
        rows.append(dict(zip(header, values)))
    return rows


def _float_or_none(val: str | None) -> float | None:
    if val is None or val == "" or val.lower() in ("null", "nan", "none"):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _build_source(row: dict) -> GaiaSource:
    pmra = _float_or_none(row.get("pmra"))
    pmdec = _float_or_none(row.get("pmdec"))
    pm: float | None = None
    if pmra is not None and pmdec is not None:
        pm = math.sqrt(pmra**2 + pmdec**2)
    parallax = _float_or_none(row.get("parallax"))
    distance_pc: float | None = None
    if parallax and parallax > 0:
        distance_pc = 1000.0 / parallax
    return GaiaSource(
        source_id=str(row.get("source_id", "")),
        ra=float(row.get("ra", 0.0)),
        dec=float(row.get("dec", 0.0)),
        pmra=pmra,
        pmdec=pmdec,
        phot_g_mean_mag=_float_or_none(row.get("phot_g_mean_mag")),
        parallax=parallax,
        distance_pc=distance_pc,
        proper_motion_mas_yr=pm,
    )


async def gaia_cone_search(
    ra: float, dec: float, radius: float, limit: int = 200
) -> list[GaiaSource]:
    """Return Gaia DR3 sources within *radius* degrees of (ra, dec)."""
    radius_deg = radius
    adql = (
        "SELECT source_id, ra, dec, pmra, pmdec, phot_g_mean_mag, parallax "
        "FROM gaiadr3.gaia_source "
        f"WHERE CONTAINS(POINT('ICRS',ra,dec), CIRCLE('ICRS',{ra},{dec},{radius_deg}))=1 "
        f"ORDER BY phot_g_mean_mag ASC NULLS LAST LIMIT {limit}"
    )
    params = {
        "REQUEST": "doQuery",
        "LANG": "ADQL",
        "QUERY": adql,
        "FORMAT": "csv",
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(_GAIA_TAP, data=params)
            resp.raise_for_status()
            rows = _parse_rows(resp.text)
            return [_build_source(r) for r in rows]
    except Exception as exc:
        logger.warning("Gaia cone search failed: %s", exc)
        return []


async def gaia_crossmatch(
    ra: float, dec: float, radius_arcsec: float
) -> GaiaSource | None:
    """Return the nearest Gaia DR3 source within *radius_arcsec* of (ra, dec)."""
    radius_deg = radius_arcsec / 3600.0
    adql = (
        "SELECT source_id, ra, dec, pmra, pmdec, phot_g_mean_mag, parallax, "
        f"DISTANCE(POINT('ICRS',ra,dec), POINT('ICRS',{ra},{dec})) AS sep "
        "FROM gaiadr3.gaia_source "
        f"WHERE CONTAINS(POINT('ICRS',ra,dec), CIRCLE('ICRS',{ra},{dec},{radius_deg}))=1 "
        "ORDER BY sep ASC LIMIT 1"
    )
    params = {
        "REQUEST": "doQuery",
        "LANG": "ADQL",
        "QUERY": adql,
        "FORMAT": "csv",
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(_GAIA_TAP, data=params)
            resp.raise_for_status()
            rows = _parse_rows(resp.text)
            if not rows:
                return None
            return _build_source(rows[0])
    except Exception as exc:
        logger.warning("Gaia crossmatch failed: %s", exc)
        return None


async def classify_spherex_source(
    ra: float,
    dec: float,
    match_radius_arcsec: float = 5.0,
    proper_motion_arcsec_yr: float | None = None,
) -> ClassificationResult:
    """Classify a SPHEREx detection by cross-matching with Gaia DR3."""
    source = await gaia_crossmatch(ra, dec, match_radius_arcsec)

    separation_arcsec: float | None = None
    if source is not None:
        # Approximate angular separation in arcsec
        d_ra = (source.ra - ra) * math.cos(math.radians(dec)) * 3600.0
        d_dec = (source.dec - dec) * 3600.0
        separation_arcsec = math.sqrt(d_ra**2 + d_dec**2)

    if source is not None:
        pm = source.proper_motion_mas_yr or 0.0
        if pm < 100.0:
            candidate_type = "known_star"
            confidence = 0.95
            mag_str = (
                f", G={source.phot_g_mean_mag:.1f}" if source.phot_g_mean_mag else ""
            )
            dist_str = (
                f" at {source.distance_pc:.0f} pc" if source.distance_pc else ""
            )
            narrative = (
                f"This position matches Gaia DR3 source {source.source_id}"
                f"{mag_str}{dist_str} "
                f"(separation {separation_arcsec:.1f}\"). "
                "It is a known catalogued star with normal proper motion."
            )
        else:
            candidate_type = "known_fast_mover"
            confidence = 0.90
            narrative = (
                f"This matches Gaia DR3 {source.source_id} — a high proper-motion star "
                f"({pm:.0f} mas/yr). Worth monitoring for annual displacement."
            )
        return ClassificationResult(
            ra=ra,
            dec=dec,
            is_known=True,
            candidate_type=candidate_type,
            confidence=confidence,
            narrative=narrative,
            separation_arcsec=separation_arcsec,
            gaia_source=source,
        )

    # No Gaia match
    if proper_motion_arcsec_yr is not None and proper_motion_arcsec_yr > 0.1:
        candidate_type = "candidate_solar_system"
        confidence = 0.75
        narrative = (
            f"No Gaia DR3 match within {match_radius_arcsec}\" but detected motion "
            f"of {proper_motion_arcsec_yr:.2f} arcsec/yr. "
            "This is a candidate solar-system object (asteroid, comet, or TNO)."
        )
    else:
        candidate_type = "candidate_brown_dwarf"
        confidence = 0.60
        narrative = (
            f"No Gaia DR3 match within {match_radius_arcsec}\" and no significant "
            "proper motion detected. Could be a faint brown dwarf, background galaxy, "
            "or a transient source not yet in the catalogue."
        )

    return ClassificationResult(
        ra=ra,
        dec=dec,
        is_known=False,
        candidate_type=candidate_type,
        confidence=confidence,
        narrative=narrative,
        separation_arcsec=None,
        gaia_source=None,
    )
