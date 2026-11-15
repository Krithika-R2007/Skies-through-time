"""unWISE / WiseView blink endpoints.

GET /unwise/blink        — all NEOWISE epochs as blink-ready metadata
GET /unwise/blink/frame  — single PNG frame for one epoch and band
GET /unwise/status       — check which unWISE epochs are available

These endpoints provide a WiseView-style multi-epoch infrared blink feed
as a permanent companion to SPHEREx data, and as a fallback when IRSA is down.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel

from app.services.unwise import fetch_unwise_blink_frames, fetch_unwise_epoch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/unwise", tags=["unwise"])

ALL_VERSIONS = ["neo1", "neo2", "neo3", "neo4", "neo5", "neo6", "neo7"]


class UnWISEFrameMeta(BaseModel):
    """Metadata for one unWISE blink frame."""
    version: str
    band: int
    date_label: str
    wavelength_um: float
    mjd_mid: float
    shape: tuple[int, int]
    frame_url: str


class UnWISEBlinkResponse(BaseModel):
    """Response from the unWISE blink endpoint."""
    ra: float
    dec: float
    band: int
    n_epochs: int
    wavelength_um: float
    frames: list[UnWISEFrameMeta]
    source: str
    note: str


@router.get(
    "/blink",
    response_model=UnWISEBlinkResponse,
    summary="WiseView-style NEOWISE multi-epoch blink feed",
)
async def unwise_blink(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Right Ascension (degrees)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Declination (degrees)"),
    band: int = Query(1, ge=1, le=2, description="WISE band: 1=3.4µm, 2=4.6µm"),
    size: int = Query(100, ge=50, le=500, description="Cutout size in pixels"),
) -> UnWISEBlinkResponse:
    """Return metadata for all available NEOWISE blink frames at a position.

    Fetches all 7 NEOWISE epochs (neo1–neo7, covering 2010–2018) concurrently
    from the unWISE server. Each frame URL points to GET /unwise/blink/frame
    which returns the actual PNG.

    Use this as a WiseView-style blink comparator — the 14-year time baseline
    makes moving objects and variable sources clearly visible.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        band: WISE band number (1=W1 3.4µm, 2=W2 4.6µm).
        size: Cutout size in pixels.

    Returns:
        UnWISEBlinkResponse with frame metadata list.
    """
    frames = await fetch_unwise_blink_frames(ra, dec, band=band, size_px=size)
    if not frames:
        raise HTTPException(
            status_code=503,
            detail="unWISE service unavailable — could not fetch any NEOWISE epochs."
        )

    wavelength_um = 3.4 if band == 1 else 4.6
    frame_metas = [
        UnWISEFrameMeta(
            version=f.version,
            band=f.band,
            date_label=f.date_label,
            wavelength_um=f.wavelength_um,
            mjd_mid=f.mjd_mid,
            shape=f.shape,
            frame_url=f"/unwise/blink/frame?ra={ra}&dec={dec}&version={f.version}&band={band}&size={size}",
        )
        for f in frames
    ]

    return UnWISEBlinkResponse(
        ra=ra,
        dec=dec,
        band=band,
        n_epochs=len(frames),
        wavelength_um=wavelength_um,
        frames=frame_metas,
        source="unWISE / NEOWISE (unwise.me)",
        note=(
            f"NEOWISE W{band} ({wavelength_um} µm) infrared coadds, 2010–2018. "
            "14-year time baseline ideal for detecting proper motion and variability. "
            "SPHEREx extends this to 102 spectral channels at higher sensitivity."
        ),
    )


@router.get(
    "/blink/frame",
    response_class=Response,
    summary="Single unWISE blink frame as PNG",
    responses={200: {"content": {"image/png": {}}}},
)
async def unwise_frame(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    version: str = Query(..., description="Epoch version: neo1–neo7"),
    band: int = Query(1, ge=1, le=2),
    size: int = Query(100, ge=50, le=500),
) -> Response:
    """Return a single unWISE epoch as a PNG image.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        version: Epoch version string (neo1 through neo7).
        band: WISE band (1=W1, 2=W2).
        size: Cutout size in pixels.

    Returns:
        PNG image response with X-MJD-Mid and X-Date-Label headers.
    """
    if version not in ALL_VERSIONS:
        raise HTTPException(status_code=422, detail=f"version must be one of {ALL_VERSIONS}")

    epoch = await fetch_unwise_epoch(ra, dec, version, band=band, size_px=size)
    if epoch is None:
        raise HTTPException(
            status_code=503,
            detail=f"Could not fetch unWISE epoch {version} — service may be temporarily unavailable."
        )

    from app.services.unwise import _image_to_png  # noqa: PLC0415
    png = _image_to_png(epoch.image_data)

    return Response(
        content=png,
        media_type="image/png",
        headers={
            "X-MJD-Mid": f"{epoch.mjd_mid:.2f}",
            # HTTP headers must be latin-1; labels like "2010–2011" use an en dash.
            "X-Date-Label": epoch.date_label.replace("\u2013", "-"),
            "X-Wavelength-Um": f"{epoch.wavelength_um:.1f}",
            "X-Version": version,
        },
    )


@router.get(
    "/changes",
    summary="Measured changes between two NEOWISE epochs of the same field",
)
async def unwise_changes(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    version_a: str = Query(..., description="Earlier epoch (neo1–neo7)"),
    version_b: str = Query(..., description="Later epoch (neo1–neo7)"),
    band: int = Query(1, ge=1, le=2),
    size: int = Query(200, ge=50, le=500),
    threshold: float = Query(5.0, ge=3.0, le=20.0, description="Detection threshold (sigma)"),
) -> dict:
    """Subtract epoch A from epoch B and report where the field changed.

    Each change has a kind (``moved``, ``brightened`` or ``faded``) and a position given
    as fractions of the frame image returned by ``/unwise/blink/frame`` (row 0 at the top).
    """
    for v in (version_a, version_b):
        if v not in ALL_VERSIONS:
            raise HTTPException(status_code=422, detail=f"version must be one of {ALL_VERSIONS}")

    import asyncio  # noqa: PLC0415
    from app.services.unwise import find_epoch_changes  # noqa: PLC0415

    ea, eb = await asyncio.gather(
        fetch_unwise_epoch(ra, dec, version_a, band=band, size_px=size),
        fetch_unwise_epoch(ra, dec, version_b, band=band, size_px=size),
    )
    if ea is None or eb is None:
        raise HTTPException(status_code=503, detail="Could not fetch both NEOWISE epochs right now.")

    years = abs(eb.mjd_mid - ea.mjd_mid) / 365.25
    changes = find_epoch_changes(ea.image_data, eb.image_data, years, threshold=threshold)
    return {
        "ra": ra, "dec": dec, "band": band,
        "version_a": version_a, "version_b": version_b,
        "years_between": round(years, 2),
        "threshold_sigma": threshold,
        "n_changes": len(changes),
        "changes": changes,
    }


@router.get(
    "/diff/frame",
    response_class=Response,
    summary="Colour difference image (later minus earlier) between two NEOWISE epochs",
    responses={200: {"content": {"image/png": {}}}},
)
async def unwise_diff_frame(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    version_a: str = Query(..., description="Earlier epoch (neo1–neo7)"),
    version_b: str = Query(..., description="Later epoch (neo1–neo7)"),
    band: int = Query(1, ge=1, le=2),
    size: int = Query(200, ge=50, le=500),
) -> Response:
    """Return B − A as a PNG: blue where the field got brighter, red where it got fainter.

    Pixel positions match the frame PNGs from ``/unwise/blink/frame`` exactly, so
    markers from ``/unwise/changes`` line up on all three images.
    """
    import asyncio  # noqa: PLC0415
    from app.services.unwise import diff_to_png  # noqa: PLC0415

    for v in (version_a, version_b):
        if v not in ALL_VERSIONS:
            raise HTTPException(status_code=422, detail=f"version must be one of {ALL_VERSIONS}")
    ea, eb = await asyncio.gather(
        fetch_unwise_epoch(ra, dec, version_a, band=band, size_px=size),
        fetch_unwise_epoch(ra, dec, version_b, band=band, size_px=size),
    )
    if ea is None or eb is None:
        raise HTTPException(status_code=503, detail="Could not fetch both NEOWISE epochs right now.")
    return Response(content=diff_to_png(ea.image_data, eb.image_data), media_type="image/png")


@router.get(
    "/changes/sequence",
    summary="Measured changes between every consecutive pair of NEOWISE epochs",
)
async def unwise_changes_sequence(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    band: int = Query(1, ge=1, le=2),
    size: int = Query(200, ge=50, le=500),
    threshold: float = Query(5.0, ge=3.0, le=20.0),
) -> dict:
    """Run the pairwise comparison for neo1→neo2, neo2→neo3, … in one call.

    A detected movement is kept only if an adjacent pair shows a movement nearby in a
    similar direction. Real movers (high proper-motion stars) keep moving the same way;
    artefacts around saturated stars jump around and are dropped.
    """
    import asyncio  # noqa: PLC0415
    import math  # noqa: PLC0415
    from app.services.unwise import find_epoch_changes  # noqa: PLC0415

    epochs = await asyncio.gather(
        *[fetch_unwise_epoch(ra, dec, v, band=band, size_px=size) for v in ALL_VERSIONS]
    )
    avail = [e for e in epochs if e is not None]
    if len(avail) < 2:
        raise HTTPException(status_code=503, detail="Fewer than two NEOWISE epochs are available here.")

    pairs = []
    for ea, eb in zip(avail, avail[1:]):
        years = abs(eb.mjd_mid - ea.mjd_mid) / 365.25
        pairs.append({
            "version_a": ea.version, "version_b": eb.version,
            "years_between": round(years, 2),
            "changes": find_epoch_changes(ea.image_data, eb.image_data, years, threshold=threshold),
        })

    def vec(c: dict) -> tuple[float, float]:
        return c["x"] - c["from_x"], c["y"] - c["from_y"]

    def agrees(c: dict, others: list[dict]) -> bool:
        vx, vy = vec(c)
        for o in others:
            if o["kind"] != "moved":
                continue
            if math.hypot(o["x"] - c["x"], o["y"] - c["y"]) > 0.08:
                continue
            ox, oy = vec(o)
            norm = math.hypot(vx, vy) * math.hypot(ox, oy)
            if norm > 0 and (vx * ox + vy * oy) / norm >= 0.5:
                return True
        return False

    for i, p in enumerate(pairs):
        neighbours = [c for k in (i - 1, i + 1) if 0 <= k < len(pairs) for c in pairs[k]["changes"]]
        p["changes"] = [c for c in p["changes"] if c["kind"] != "moved" or agrees(c, neighbours)]
        p["n_changes"] = len(p["changes"])

    return {"ra": ra, "dec": dec, "band": band, "threshold_sigma": threshold, "pairs": pairs}


@router.get(
    "/status",
    summary="Check which unWISE epochs are available",
)
async def unwise_status(
    ra: float = Query(46.54, ge=0.0, lt=360.0),
    dec: float = Query(-5.044, ge=-90.0, le=90.0),
) -> dict:
    """Probe all 7 unWISE epochs and report which ones respond.

    Args:
        ra: Test RA (defaults to TRAPPIST-1 field).
        dec: Test Dec.

    Returns:
        Dict mapping version to availability status.
    """
    import asyncio  # noqa: PLC0415
    import httpx  # noqa: PLC0415

    async def probe(version: str) -> tuple[str, str]:
        url = f"https://unwise.me/cutout_fits?version={version}&ra={ra}&dec={dec}&size=10&bands=1"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.head(url, follow_redirects=True)
                return version, "ok" if r.status_code == 200 else f"HTTP {r.status_code}"
        except Exception as e:
            return version, f"error: {str(e)[:60]}"

    results = await asyncio.gather(*[probe(v) for v in ALL_VERSIONS])
    return {
        "unwise_service": "https://unwise.me",
        "epochs": dict(results),
        "note": "W1=3.4µm W2=4.6µm, neo1=2010-11 through neo7=2017-18",
    }
