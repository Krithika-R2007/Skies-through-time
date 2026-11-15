"""Source detection service — simple peak-finding on a 2D image."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

try:
    from scipy.ndimage import maximum_filter  # type: ignore[import]
    _SCIPY_OK = True
except ImportError:
    _SCIPY_OK = False


@dataclass
class SourceDetection:
    x_pix: float
    y_pix: float
    ra: float
    dec: float
    flux: float
    snr: float
    epoch_index: int


def detect_sources(
    image: np.ndarray,
    epoch_index: int,
    wcs: Any,
    sigma_threshold: float = 3.0,
    max_sources: int = 50,
) -> list[SourceDetection]:
    """Find local peaks above *sigma_threshold* sigma in a 2D image.

    Args:
        image: 2D float numpy array.
        epoch_index: Epoch number, stored in each detection.
        wcs: astropy WCS (or _IdentityWCS) for pixel → RA/Dec conversion.
        sigma_threshold: Detection threshold in sigma.
        max_sources: Maximum number of sources to return.

    Returns:
        Up to *max_sources* SourceDetection objects, sorted by flux descending.
    """
    img = np.nan_to_num(image, nan=0.0)

    if img.size == 0 or img.std() == 0:
        return []

    threshold = img.mean() + sigma_threshold * img.std()

    # Find local maxima
    if _SCIPY_OK:
        footprint = np.ones((5, 5), dtype=bool)
        local_max = maximum_filter(img, footprint=footprint)
        peaks = (img == local_max) & (img > threshold)
    else:
        # Simple dilation fallback
        peaks = np.zeros(img.shape, dtype=bool)
        h, w = img.shape
        for y in range(2, h - 2):
            for x in range(2, w - 2):
                val = img[y, x]
                if val > threshold and val == img[y - 2: y + 3, x - 2: x + 3].max():
                    peaks[y, x] = True

    ys, xs = np.where(peaks)
    if len(xs) == 0:
        return []

    fluxes = img[ys, xs]
    order = np.argsort(fluxes)[::-1][:max_sources]

    detections: list[SourceDetection] = []
    sigma = img.std() + 1e-10

    for i in order:
        px, py = float(xs[i]), float(ys[i])
        flux = float(fluxes[i])
        snr = flux / sigma

        ra, dec = float(px), float(py)
        try:
            world = wcs.all_pix2world([[px, py]], 0)
            ra, dec = float(world[0][0]), float(world[0][1])
        except Exception:
            pass

        detections.append(
            SourceDetection(
                x_pix=px,
                y_pix=py,
                ra=ra,
                dec=dec,
                flux=flux,
                snr=snr,
                epoch_index=epoch_index,
            )
        )

    return detections
