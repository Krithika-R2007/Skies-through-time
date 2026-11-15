"""Epoch alignment service — extracts images and WCS from FITS HDULists."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class AlignedEpoch:
    epoch_index: int
    image: np.ndarray
    wcs: Any  # astropy.wcs.WCS or simple identity object


class _IdentityWCS:
    """Minimal stand-in when astropy WCS is unavailable or malformed."""

    naxis = 2

    def all_pix2world(self, pixels, origin):
        return [[float(p[0]), float(p[1])] for p in pixels]

    def all_world2pix(self, coords, origin):
        return [[float(c[0]), float(c[1])] for c in coords]


def align_epochs(hduls: list, obsids: list[str]) -> list[AlignedEpoch]:
    """Extract an image and WCS from each FITS HDUList.

    No actual reprojection is performed — this is a stub that returns each
    epoch's image with its native WCS.  Real alignment can be added later
    using reproject or astroalign.

    Args:
        hduls: List of astropy HDULists.
        obsids: Matching OBSID labels (used for logging).

    Returns:
        List of AlignedEpoch objects.
    """
    results: list[AlignedEpoch] = []

    for idx, (hdul, obsid) in enumerate(zip(hduls, obsids)):
        try:
            image_data = hdul["IMAGE"].data
        except (KeyError, AttributeError):
            logger.warning("No IMAGE extension in %s, skipping", obsid)
            continue

        if image_data is None:
            logger.warning("IMAGE extension empty in %s, skipping", obsid)
            continue

        image = np.array(image_data, dtype=np.float64)
        # Take first plane if 3D
        while image.ndim > 2:
            image = image[0]
        image = np.nan_to_num(image, nan=0.0)

        # Try to load WCS
        wcs: Any = _IdentityWCS()
        try:
            from astropy.wcs import WCS  # noqa: PLC0415

            candidate = WCS(hdul["IMAGE"].header)
            if candidate.naxis >= 2:
                wcs = candidate
        except Exception:
            pass

        results.append(AlignedEpoch(epoch_index=idx, image=image, wcs=wcs))

    return results
