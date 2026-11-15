"""SPHEREx spectral channel image extraction."""

from __future__ import annotations

import numpy as np
from astropy.visualization import ZScaleInterval


def _wavelength(channel: int) -> float:
    """Linear wavelength mapping: channel 0 = 0.75 µm, channel 101 = 5.0 µm."""
    return 0.75 + channel * (5.0 - 0.75) / 101


def extract_channel_image(hdul, channel: int) -> tuple[np.ndarray, float]:
    """Extract a single spectral channel as a uint8 pixel array.

    Args:
        hdul: astropy HDUList from a SPHEREx FITS cutout.
        channel: Channel index 0–101.

    Returns:
        (pixel_array uint8, wavelength_um)
    """
    image_data = hdul["IMAGE"].data
    if image_data is None:
        raise ValueError("IMAGE extension has no data")

    if image_data.ndim == 3:
        n_planes = image_data.shape[0]
        if channel >= n_planes:
            raise IndexError(
                f"Channel {channel} out of range — cube has {n_planes} planes"
            )
        plane = image_data[channel].astype(np.float64)
    else:
        plane = image_data.astype(np.float64)

    plane = np.nan_to_num(plane, nan=0.0)
    interval = ZScaleInterval()
    vmin, vmax = interval.get_limits(plane)
    stretched = np.clip((plane - vmin) / (vmax - vmin + 1e-10), 0, 1)
    pixel_array = (stretched * 255).astype(np.uint8)

    return pixel_array, _wavelength(channel)


def channel_metadata(hdul) -> list[dict]:
    """Return wavelength metadata for all 102 SPHEREx channels.

    Args:
        hdul: astropy HDUList (used to infer plane count if available).

    Returns:
        List of {"channel": int, "wavelength_um": float} dicts.
    """
    return [
        {"channel": i, "wavelength_um": round(_wavelength(i), 4)}
        for i in range(102)
    ]
