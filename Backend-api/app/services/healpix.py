"""HEALPix coverage service — with graceful fallback when healpy is absent."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)

try:
    import healpy as hp  # type: ignore[import]
    _HEALPY_OK = True
except ImportError:
    _HEALPY_OK = False
    logger.info("healpy not installed — using grid fallback for HEALPix coverage")


@dataclass
class HEALPixCoverage:
    nside: int
    n_pixels: int
    pixels: list[int]
    ra_centres: list[float]
    dec_centres: list[float]


def viewport_to_healpix(
    ra_min: float,
    ra_max: float,
    dec_min: float,
    dec_max: float,
    nside: int = 64,
) -> HEALPixCoverage:
    """Return HEALPix pixels covering a sky viewport.

    Uses healpy if available; otherwise generates a uniform grid of fake
    pixel IDs whose centres span the viewport.
    """
    if _HEALPY_OK:
        try:
            return _healpix_query(ra_min, ra_max, dec_min, dec_max, nside)
        except Exception as exc:
            logger.warning("healpy query failed, using grid fallback: %s", exc)

    return _grid_fallback(ra_min, ra_max, dec_min, dec_max, nside)


def _healpix_query(
    ra_min: float, ra_max: float, dec_min: float, dec_max: float, nside: int
) -> HEALPixCoverage:
    import healpy as hp  # noqa: PLC0415

    # Sample a grid of points inside the viewport and collect which pixels they fall in
    n_ra = max(8, int((ra_max - ra_min) / (90.0 / nside)) + 2)
    n_dec = max(8, int((dec_max - dec_min) / (90.0 / nside)) + 2)

    ras = np.linspace(ra_min, ra_max, n_ra)
    decs = np.linspace(dec_min, dec_max, n_dec)
    ra_grid, dec_grid = np.meshgrid(ras, decs)

    theta = np.radians(90.0 - dec_grid.ravel())
    phi = np.radians(ra_grid.ravel())
    pix_ids = hp.ang2pix(nside, theta, phi, nest=False)
    unique_pix = np.unique(pix_ids)

    # Get centres for unique pixels
    thetas, phis = hp.pix2ang(nside, unique_pix, nest=False)
    ra_centres = (np.degrees(phis) % 360.0).tolist()
    dec_centres = (90.0 - np.degrees(thetas)).tolist()

    return HEALPixCoverage(
        nside=nside,
        n_pixels=len(unique_pix),
        pixels=unique_pix.tolist(),
        ra_centres=ra_centres,
        dec_centres=dec_centres,
    )


def _grid_fallback(
    ra_min: float, ra_max: float, dec_min: float, dec_max: float, nside: int
) -> HEALPixCoverage:
    """Generate a simple uniform grid covering the viewport."""
    n_pts = max(4, nside * nside // 10)
    n_side_pts = max(2, int(n_pts**0.5))

    ras = np.linspace(ra_min, ra_max, n_side_pts).tolist()
    decs = np.linspace(dec_min, dec_max, n_side_pts).tolist()

    ra_centres = []
    dec_centres = []
    pixel_ids = []
    idx = 0
    for d in decs:
        for r in ras:
            ra_centres.append(float(r))
            dec_centres.append(float(d))
            pixel_ids.append(idx)
            idx += 1

    return HEALPixCoverage(
        nside=nside,
        n_pixels=len(pixel_ids),
        pixels=pixel_ids,
        ra_centres=ra_centres,
        dec_centres=dec_centres,
    )
