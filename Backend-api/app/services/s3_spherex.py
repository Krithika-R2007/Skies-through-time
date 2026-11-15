"""SPHEREx DR1 direct S3 access and HiPS tile lookup.

This module provides fallback access to SPHEREx data when IRSA TAP is down,
using the publicly available HiPS cube on AWS S3.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0)

# SPHEREx DR1 HiPS cube base URL on S3
_HIPS_BASE = "https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/hips5_cube/hips_20261026"


@dataclass
class S3CutoutResult:
    """A single SPHEREx cutout found via S3."""
    obsid: str
    bandpass_id: str | None
    mjd_obs: str | None   # ISO timestamp string
    s3_url: str


def _healpix_norder5_pixel(ra: float, dec: float) -> int:
    """Approximate HEALPix Norder=5 pixel index for a given RA/Dec.

    Uses a simple zone-based approximation. Good enough to identify
    the correct HiPS tile for the fallback.

    Args:
        ra: Right Ascension in degrees [0, 360).
        dec: Declination in degrees [-90, 90].

    Returns:
        Approximate HEALPix pixel index.
    """
    try:
        import healpy as hp  # noqa: PLC0415
        import numpy as np   # noqa: PLC0415
        theta = np.radians(90.0 - dec)
        phi = np.radians(ra)
        return int(hp.ang2pix(32, theta, phi, nest=False))
    except ImportError:
        pass

    # Fallback: manual RING scheme approximation for Norder=5 (nside=32)
    # nside=32 → 12*32^2 = 12288 pixels
    import math
    nside = 32
    z = math.sin(math.radians(dec))
    phi = math.radians(ra)

    if abs(z) > 2.0 / 3.0:
        # Polar caps
        tp = math.sqrt(3.0 * (1.0 - abs(z)))
        tp_phi = phi / (math.pi / 2.0)
        jp = int(nside * tp_phi)
        jm = int(nside * (1.0 - tp_phi + tp))
        ir = nside + 1 - jp
        kshift = 0 if ir % 2 == 0 else 1
        ip = (jp + jm - nside + 1 + kshift) // 2 % (4 * nside)
        if z >= 0:
            ipix = 2 * nside * (nside - 1) + (4 * nside) * (ir - 1) + ip
        else:
            ipix = 12 * nside * nside - 2 * nside * (nside + 1) + (4 * nside) * (ir - 1) + ip
    else:
        # Equatorial belt
        temp1 = nside * (0.5 + phi / (2.0 * math.pi))
        temp2 = nside * z * 0.75
        jp = int(temp1 - temp2)
        jm = int(temp1 + temp2)
        ir = int(jp // nside) - int(jm // nside) + 1
        kshift = 1 - (ir % 2)
        ip = (jp + jm - nside * (ir - 1) + 1 + kshift) // 2 % (4 * nside)
        ipiz = 2 * nside * (nside + 1) + 4 * nside * (ir - 1) + ip
        ipix = int(ipiz)

    return max(0, min(12 * nside * nside - 1, ipix))


async def query_spherex_hips(ra: float, dec: float) -> list[S3CutoutResult]:
    """Look up the SPHEREx HiPS tile covering a sky position.

    Attempts to find the appropriate Norder=5 HiPS cube tile on S3.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.

    Returns:
        List with one S3CutoutResult if the tile exists, empty list otherwise.
    """
    pixel = _healpix_norder5_pixel(ra, dec)
    dir_num = (pixel // 10000) * 10000
    url = f"{_HIPS_BASE}/Norder5/Dir{dir_num}/Npix{pixel}_cube.fits"

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        try:
            r = await client.head(url)
            if r.status_code == 200:
                logger.info("HiPS tile found: %s", url)
                return [
                    S3CutoutResult(
                        obsid=f"SPHEREx_DR1_HiPS_Npix{pixel}",
                        bandpass_id="SPHEREx-ALL",
                        mjd_obs="2025-11-02T04:28:12Z",
                        s3_url=url,
                    )
                ]
        except Exception as exc:
            logger.debug("HiPS tile HEAD failed: %s", exc)

    return []


async def query_spherex_s3(
    ra: float,
    dec: float,
    max_weeks: int = 10,
    detectors: list[int] | None = None,
) -> list[S3CutoutResult]:
    """Scan for SPHEREx Level-2 files on S3 near a position.

    This is a last-resort fallback — it tries a small set of known
    path patterns on the S3 bucket.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        max_weeks: Maximum number of weekly directories to scan.
        detectors: Detector IDs to try (default: [1, 4]).

    Returns:
        List of S3CutoutResult objects found.
    """
    if detectors is None:
        detectors = [1, 4]

    results: list[S3CutoutResult] = []
    base = "https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/l2"

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for week in range(1, min(max_weeks + 1, 6)):
            for det in detectors:
                url = f"{base}/week{week:03d}/det{det:02d}/spherex_l2_w{week:03d}_d{det:02d}.fits"
                try:
                    r = await client.head(url)
                    if r.status_code == 200:
                        results.append(
                            S3CutoutResult(
                                obsid=f"SPHEREx_L2_w{week:03d}_d{det:02d}",
                                bandpass_id=f"SPHEREx-DET{det:02d}",
                                mjd_obs=None,
                                s3_url=url,
                            )
                        )
                except Exception:
                    continue

    return results
