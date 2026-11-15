"""Health check endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from app.dependencies import DbSession, OptionalRedis

router = APIRouter(prefix="/health", tags=["health"])
logger = logging.getLogger(__name__)


@router.get("", summary="Liveness check")
async def health() -> dict[str, str]:
    """Return a simple alive response with no external dependencies."""
    return {"status": "ok"}


@router.get("/ready", summary="Readiness check (DB + Redis)")
async def readiness(
    db: DbSession,
    redis: OptionalRedis,
) -> dict:
    """Check that the database and Redis cache are reachable."""
    result: dict[str, Any] = {}

    # Database ping
    try:
        await db.execute(text("SELECT 1"))
        result["database"] = "ok"
    except Exception as exc:
        logger.error("DB health check failed: %s", exc)
        result["database"] = f"error: {exc}"

    # Redis ping
    if redis is None:
        result["redis"] = "unavailable (no Redis configured — caching disabled)"
    else:
        try:
            pong = await redis.ping()
            result["redis"] = "ok" if pong else "no response"
        except Exception as exc:
            logger.error("Redis health check failed: %s", exc)
            result["redis"] = f"error: {exc}"

    overall = "ok" if result.get("database") == "ok" else "degraded"
    result["status"] = overall
    return result
