"""SPHEREx Timekeeper — FastAPI application entry point.

Start with:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.routers import (
    cadc,
    explore,
    gaia,
    health,
    journal,
    motion,
    neossat,
    search,
    sky,
    spectrum,
    unwise,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifespan: initialise DB and load anomaly data at startup."""
    # Create database tables
    try:
        from app.dependencies import _engine  # noqa: PLC0415
        from app.models.journal import Base  # noqa: PLC0415

        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
    except Exception as exc:
        logger.warning("DB initialisation failed (continuing without DB): %s", exc)

    # Load anomaly CSV if present
    try:
        import os  # noqa: PLC0415
        from app.dependencies import load_anomaly_lookup  # noqa: PLC0415

        csv_candidates = [
            "anomaly_data.csv",
            "data/anomaly_data.csv",
            "app/data/anomaly_data.csv",
        ]
        for path in csv_candidates:
            if os.path.exists(path):
                load_anomaly_lookup(path)
                logger.info("Loaded anomaly data from %s", path)
                break
        else:
            logger.info("No anomaly CSV found — anomaly overlay disabled")
    except Exception as exc:
        logger.warning("Anomaly data load failed (skipping): %s", exc)

    yield  # Application runs here

    # Shutdown: close DB engine
    try:
        from app.dependencies import _engine  # noqa: PLC0415
        await _engine.dispose()
    except Exception:
        pass


app = FastAPI(
    title="SPHEREx Timekeeper",
    description=(
        "Backend API for Skies Through Time — explore SPHEREx multi-epoch "
        "infrared observations, detect moving objects, and extract spectra."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development; restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(search.router)
app.include_router(sky.router)
app.include_router(explore.router)
app.include_router(spectrum.router)
app.include_router(motion.router)
app.include_router(gaia.router)
app.include_router(neossat.router)
app.include_router(cadc.router)
app.include_router(unwise.router)
app.include_router(journal.router)


@app.get("/test", response_class=HTMLResponse, include_in_schema=False)
async def test_ui() -> HTMLResponse:
    """Simple test page — links to the interactive API docs."""
    html = """
    <!doctype html>
    <html>
    <head><title>SPHEREx Timekeeper API</title></head>
    <body style="font-family:sans-serif;max-width:600px;margin:40px auto">
      <h1>🔭 SPHEREx Timekeeper API</h1>
      <p>The backend is running.</p>
      <ul>
        <li><a href="/docs">Interactive API docs (Swagger UI)</a></li>
        <li><a href="/redoc">API docs (ReDoc)</a></li>
        <li><a href="/health">Health check</a></li>
        <li><a href="/health/ready">Readiness check (DB + Redis)</a></li>
      </ul>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
