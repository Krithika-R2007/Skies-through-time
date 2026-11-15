"""NEOSSat observation service — queries CADC VO for the NEOSSAT collection."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

_CADC_TAP = "https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/tap/sync"
_CADC_DATA_BASE = "https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/data/pub/NEOSSAT"
_TIMEOUT = httpx.Timeout(60.0)


@dataclass
class NEOSSatObservation:
    obs_id: str
    ra: float
    dec: float
    start_time: datetime | None
    exposure_time_s: float | None
    target_name: str | None
    instrument: str
    access_url: str | None
    fits_download_url: str | None


def _float_or(val: str | None, default: float = 0.0) -> float:
    if not val:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _datetime_or_none(val: str | None) -> datetime | None:
    if not val or val.lower() in ("", "null", "nan", "none"):
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            pass
    try:
        from astropy.time import Time  # noqa: PLC0415
        return Time(float(val), format="mjd").to_datetime()
    except Exception:
        pass
    return None


def _parse_csv(text: str) -> list[dict]:
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


async def neossat_cone_search(
    ra: float,
    dec: float,
    radius: float,
    limit: int = 50,
) -> list[NEOSSatObservation]:
    """Return NEOSSat observations near (ra, dec) from CADC.

    Args:
        ra: Centre RA in degrees.
        dec: Centre Dec in degrees.
        radius: Search radius in degrees.
        limit: Maximum rows to return.

    Returns:
        List of NEOSSatObservation objects, most recent first.
    """
    adql = (
        "SELECT o.observationID, p.position_bounds_cval1, p.position_bounds_cval2, "
        "o.target_name, p.time_exposure, p.time_bounds_lower, "
        "p.access_url "
        "FROM caom2.Observation AS o "
        "JOIN caom2.Plane AS p ON p.obsID = o.obsID "
        "WHERE o.collection = 'NEOSSAT' "
        f"AND CONTAINS(POINT('ICRS',{ra},{dec}), p.position_bounds) = 1 "
        "ORDER BY p.time_bounds_lower DESC "
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

        results: list[NEOSSatObservation] = []
        for row in rows:
            obs_id = str(row.get("observationID", ""))
            obs_ra = _float_or(row.get("position_bounds_cval1"), default=ra)
            obs_dec = _float_or(row.get("position_bounds_cval2"), default=dec)
            access_url = row.get("access_url") or None
            fits_url = (
                f"{_CADC_DATA_BASE}/{obs_id}"
                if obs_id else None
            )
            results.append(
                NEOSSatObservation(
                    obs_id=obs_id,
                    ra=obs_ra,
                    dec=obs_dec,
                    start_time=_datetime_or_none(row.get("time_bounds_lower")),
                    exposure_time_s=_float_or(row.get("time_exposure")) or None,
                    target_name=row.get("target_name") or None,
                    instrument="NEOWISE",
                    access_url=access_url,
                    fits_download_url=fits_url,
                )
            )
        return results

    except Exception as exc:
        logger.warning("NEOSSat cone search failed: %s", exc)
        return []
