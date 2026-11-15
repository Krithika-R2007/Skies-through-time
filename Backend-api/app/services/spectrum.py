"""SPHEREx on-the-fly spectrum extraction service."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)


def _wavelength(plane: int) -> float:
    return 0.75 + plane * (5.0 - 0.75) / 101


@dataclass
class SpectrumPoint:
    wavelength_um: float
    flux_mjy_sr: float
    flux_error_mjy_sr: float


def extract_spectrum(hdul, ra: float, dec: float) -> list[SpectrumPoint]:
    """Extract an aperture-photometry spectrum from a SPHEREx FITS cutout.

    Args:
        hdul: astropy HDUList with an IMAGE extension.
        ra: Target RA (used for WCS pixel lookup if available).
        dec: Target Dec.

    Returns:
        List of SpectrumPoint objects, one per spectral plane.
    """
    try:
        image_data = hdul["IMAGE"].data
    except (KeyError, AttributeError):
        logger.warning("No IMAGE extension found in FITS")
        return []

    if image_data is None:
        return []

    image_data = np.array(image_data, dtype=np.float64)

    if image_data.ndim == 2:
        ny, nx = image_data.shape
        cy, cx = ny // 2, nx // 2
        aperture = image_data[
            max(0, cy - 1): cy + 2,
            max(0, cx - 1): cx + 2,
        ]
        flux = float(np.nanmean(aperture))
        err = float(np.nanstd(aperture)) if aperture.size > 1 else 0.0
        return [SpectrumPoint(wavelength_um=_wavelength(0), flux_mjy_sr=flux, flux_error_mjy_sr=err)]

    if image_data.ndim == 3:
        n_planes, ny, nx = image_data.shape
        points: list[SpectrumPoint] = []

        # Try WCS to find the pixel nearest (ra, dec)
        cx, cy = nx // 2, ny // 2
        try:
            from astropy.wcs import WCS  # noqa: PLC0415
            wcs = WCS(hdul["IMAGE"].header)
            if wcs.naxis >= 2:
                px, py = wcs.all_world2pix([[ra, dec]], 0)[0][:2]
                cx, cy = int(round(float(px))), int(round(float(py)))
                cx = max(1, min(nx - 2, cx))
                cy = max(1, min(ny - 2, cy))
        except Exception:
            pass

        for plane_idx in range(n_planes):
            plane = image_data[plane_idx]
            aperture = plane[
                max(0, cy - 1): cy + 2,
                max(0, cx - 1): cx + 2,
            ]
            flux = float(np.nanmean(aperture))
            err = float(np.nanstd(aperture)) if aperture.size > 1 else 0.0
            points.append(
                SpectrumPoint(
                    wavelength_um=_wavelength(plane_idx),
                    flux_mjy_sr=flux,
                    flux_error_mjy_sr=err,
                )
            )
        return points

    return []
