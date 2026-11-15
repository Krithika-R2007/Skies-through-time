"""FastAPI dependency providers for DB session, Redis, and anomaly lookup."""

from __future__ import annotations

import csv
import logging
from typing import Annotated, Any, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

logger = logging.getLogger(__name__)

# ── Database ──────────────────────────────────────────────────────────────────

_engine = create_async_engine(settings.database_url, echo=False)
_session_factory = async_sessionmaker(_engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session, committing on success."""
    async with _session_factory() as session:
        async with session.begin():
            yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]


# ── Redis (optional) ──────────────────────────────────────────────────────────


async def get_redis() -> Any:
    """Return a Redis client if configured, otherwise None."""
    if not settings.redis_url:
        return None
    try:
        import redis.asyncio as aioredis  # type: ignore[import]

        client = aioredis.from_url(settings.redis_url, decode_responses=False)
        await client.ping()
        return client
    except Exception as exc:
        logger.warning("Redis connection failed, caching disabled: %s", exc)
        return None


OptionalRedis = Annotated[Any, Depends(get_redis)]


# ── Anomaly lookup ────────────────────────────────────────────────────────────

_anomaly_lookup: dict[str, list] = {}


def get_anomaly_lookup() -> dict[str, list]:
    """Return the in-memory anomaly lookup dict."""
    return _anomaly_lookup


def load_anomaly_lookup(path: str) -> None:
    """Populate the anomaly lookup from a CSV file at *path*.

    The CSV is expected to have columns:
    obsid, anomaly_type, anomaly_name,
    band_1_affected ... band_6_affected

    Missing or malformed rows are silently skipped.
    """
    global _anomaly_lookup
    _anomaly_lookup.clear()

    try:
        with open(path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                obsid = row.get("obsid", "").strip()
                if not obsid:
                    continue
                _anomaly_lookup.setdefault(obsid, []).append(
                    {
                        "obsid": obsid,
                        "anomaly_type": row.get("anomaly_type", ""),
                        "anomaly_name": row.get("anomaly_name", ""),
                        "band_1_affected": int(row.get("band_1_affected", 0) or 0),
                        "band_2_affected": int(row.get("band_2_affected", 0) or 0),
                        "band_3_affected": int(row.get("band_3_affected", 0) or 0),
                        "band_4_affected": int(row.get("band_4_affected", 0) or 0),
                        "band_5_affected": int(row.get("band_5_affected", 0) or 0),
                        "band_6_affected": int(row.get("band_6_affected", 0) or 0),
                    }
                )
        logger.info("Loaded anomaly lookup: %d OBSIDs", len(_anomaly_lookup))
    except FileNotFoundError:
        logger.info("Anomaly CSV not found at %s — anomaly overlay disabled", path)
    except Exception as exc:
        logger.warning("Failed to load anomaly CSV: %s", exc)


AnomalyLookup = Annotated[dict, Depends(get_anomaly_lookup)]
