"""IRSA TAP and FITS cutout service functions."""

from __future__ import annotations

import logging
from datetime import datetime
from io import BytesIO
from typing import Any

import httpx

from app.config import settings
from app.schemas.sky import AnomalyFlag, CutoutInfo

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(60.0)


async def query_spherex_obscore(ra: float, dec: float, size: float) -> list[dict]:
    """Query IRSA TAP obscore for SPHEREx observations near a position.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        size: Search radius in degrees.

    Returns:
        List of dicts with keys: obsid, bandpass_id, epoch_timestamp, cutout_url.
    """
    adql = (
        "SELECT obsid, bandpass_id, t_min AS epoch_timestamp, "
        "access_url AS cutout_url "
        "FROM spherex.obscore "
        f"WHERE CONTAINS(POINT('ICRS',{ra},{dec}), s_region) = 1 "
        "ORDER BY t_min"
    )
    params = {"LANG": "ADQL", "REQUEST": "doQuery", "QUERY": adql, "FORMAT": "json"}

    # Short timeout so the caller can fall back quickly when IRSA is down or slow.
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        response = await client.post(settings.irsa_tap_url, data=params)
        response.raise_for_status()
        data = response.json()

    # Parse IRSA TAP JSON format
    rows: list[dict] = []
    if isinstance(data, dict) and "data" in data:
        cols = [c["name"] for c in data.get("metadata", [])]
        for row in data["data"]:
            rows.append(dict(zip(cols, row)))
    elif isinstance(data, list):
        rows = data

    return rows


async def fetch_cutout_fits(url: str, redis_client: Any = None):
    """Download a FITS file from *url*, optionally caching bytes in Redis.

    Returns:
        astropy.io.fits.HDUList
    """
    from astropy.io import fits  # noqa: PLC0415

    cache_key = f"fits:{url}"

    # Check Redis cache
    if redis_client is not None:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                return fits.open(BytesIO(cached))
        except Exception as exc:
            logger.debug("Redis get failed: %s", exc)

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(url)
        response.raise_for_status()
        content = response.content

    # Store in Redis
    if redis_client is not None:
        try:
            await redis_client.setex(cache_key, settings.cache_ttl_seconds, content)
        except Exception as exc:
            logger.debug("Redis set failed: %s", exc)

    return fits.open(BytesIO(content))


def build_cutout_info_list(
    rows: list[dict], anomaly_lookup: dict[str, list]
) -> list[CutoutInfo]:
    """Convert raw TAP rows to CutoutInfo objects, attaching anomaly flags.

    Args:
        rows: Raw rows from IRSA TAP query.
        anomaly_lookup: Dict mapping obsid → list of anomaly dicts.

    Returns:
        List of CutoutInfo objects.
    """
    results: list[CutoutInfo] = []
    for row in rows:
        obsid = str(row.get("obsid", ""))
        bandpass_id = str(row.get("bandpass_id", ""))
        cutout_url = str(row.get("cutout_url", row.get("access_url", "")))

        # Parse epoch timestamp
        epoch_ts: datetime | None = None
        raw_ts = row.get("epoch_timestamp") or row.get("t_min")
        if raw_ts is not None:
            if isinstance(raw_ts, str):
                try:
                    epoch_ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                except ValueError:
                    try:
                        # MJD as string
                        from astropy.time import Time  # noqa: PLC0415
                        epoch_ts = Time(float(raw_ts), format="mjd").to_datetime()
                    except Exception:
                        pass
            elif isinstance(raw_ts, (int, float)):
                try:
                    from astropy.time import Time  # noqa: PLC0415
                    epoch_ts = Time(float(raw_ts), format="mjd").to_datetime()
                except Exception:
                    pass

        # Normalise to UTC-aware so mixed sources (IRSA/S3/unWISE) can be compared.
        if epoch_ts is not None and epoch_ts.tzinfo is None:
            from datetime import timezone  # noqa: PLC0415
            epoch_ts = epoch_ts.replace(tzinfo=timezone.utc)

        # Build anomaly flags
        flags: list[AnomalyFlag] = []
        for anom in anomaly_lookup.get(obsid, []):
            try:
                flags.append(AnomalyFlag(**anom))
            except Exception:
                pass

        results.append(
            CutoutInfo(
                obsid=obsid,
                bandpass_id=bandpass_id,
                epoch_timestamp=epoch_ts,
                cutout_url=cutout_url,
                anomaly_flags=flags,
            )
        )

    return results
