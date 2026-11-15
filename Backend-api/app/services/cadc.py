"""CADC VO cone-search service for HST, JWST, Gemini, and NEOSSat collections."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

# CADC IVOA ObsTAP endpoint
_CADC_TAP = "https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/tap/sync"
_TIMEOUT = httpx.Timeout(60.0)

SUPPORTED_COLLECTIONS = ["HST", "JWST", "GEMINI", "NEOSSAT"]


@dataclass
class CADCObservation:
    obs_id: str
    collection: str
    target_name: str | None
    data_product_type: str | None
    calibration_level: int | None
    time_start: datetime | None
    time_end: datetime | None
    exposure_time_s: float | None
    position_bounds: str | None


def _parse_csv(text: str) -> list[dict]:
    """Parse simple CSV response from CADC TAP."""
    lines = text.strip().splitlines()
    if len(lines) < 2:
        return []
    header = [h.strip().strip('"') for h in lines[0].split(",")]
    rows = []
    for line in lines[1:]:
        values = [v.strip().strip('"') for v in line.split(",")]
        if len(values) == len(header):
            rows.append(dict(zip(header, values)))
    return rows


def _float_or_none(val: str | None) -> float | None:
    if not val or val.lower() in ("", "null", "nan", "none"):
        return None
    try:
        return float(val)
    except ValueError:
        return None


def _int_or_none(val: str | None) -> int | None:
    if not val or val.lower() in ("", "null", "nan", "none"):
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _datetime_or_none(val: str | None) -> datetime | None:
    """Parse an ISO datetime string or MJD float string."""
    if not val or val.lower() in ("", "null", "nan", "none"):
        return None
    # Try ISO format first
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            pass
    # Try MJD
    try:
        from astropy.time import Time  # noqa: PLC0415
        return Time(float(val), format="mjd").to_datetime()
    except Exception:
        pass
    return None


def _build_obs(row: dict, collection: str) -> CADCObservation:
    return CADCObservation(
        obs_id=str(row.get("obs_id", row.get("observationID", ""))),
        collection=collection,
        target_name=row.get("target_name") or None,
        data_product_type=row.get("dataproduct_type") or None,
        calibration_level=_int_or_none(row.get("calib_level")),
        time_start=_datetime_or_none(row.get("t_min")),
        time_end=_datetime_or_none(row.get("t_max")),
        exposure_time_s=_float_or_none(row.get("t_exptime")),
        position_bounds=row.get("s_region") or None,
    )


async def cadc_cone_search(
    ra: float,
    dec: float,
    radius: float,
    collection: str,
    limit: int = 50,
) -> list[CADCObservation]:
    """Return CADC observations near (ra, dec) for a specific collection.

    Args:
        ra: Centre RA in degrees.
        dec: Centre Dec in degrees.
        radius: Search radius in degrees.
        collection: One of SUPPORTED_COLLECTIONS.
        limit: Maximum rows to return.

    Returns:
        List of CADCObservation objects, most recent first.
    """
    adql = (
        "SELECT obs_id, target_name, dataproduct_type, calib_level, "
        "t_min, t_max, t_exptime, s_region "
        "FROM caom2.Observation AS o "
        "JOIN caom2.Plane AS p ON p.obsID = o.obsID "
        f"WHERE o.collection = '{collection}' "
        f"AND CONTAINS(POINT('ICRS',{ra},{dec}), s_region) = 1 "
        "ORDER BY t_min DESC "
        f"LIMIT {limit}"
    )
    params = {
        "REQUEST": "doQuery",
        "LANG": "ADQL",
        "QUERY": adql,
        "FORMAT": "csv",
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(_CADC_TAP, params=params)
            resp.raise_for_status()
            rows = _parse_csv(resp.text)
            return [_build_obs(row, collection) for row in rows]
    except Exception as exc:
        logger.warning("CADC cone search for %s failed: %s", collection, exc)
        return []
