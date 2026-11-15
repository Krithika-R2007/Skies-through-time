"""FITS FLAGS/MASK extension utilities."""

from __future__ import annotations

import numpy as np


def extract_flags_from_hdul(hdul) -> np.ndarray | None:
    """Return the FLAGS or MASK extension data as an int array, or None."""
    for name in ("FLAGS", "MASK"):
        try:
            ext = hdul[name]
            if ext.data is not None:
                return np.array(ext.data, dtype=int)
        except (KeyError, AttributeError):
            continue
    return None


def flags_summary(flags_arr: np.ndarray) -> dict:
    """Return counts of each unique flag value."""
    unique, counts = np.unique(flags_arr, return_counts=True)
    return {str(int(u)): int(c) for u, c in zip(unique, counts)}


def bad_pixel_mask(flags_arr: np.ndarray) -> np.ndarray:
    """Return a boolean mask where True = bad pixel (flags != 0)."""
    return flags_arr != 0


def flags_to_json_serializable(flags_arr: np.ndarray) -> list:
    """Convert flags array to a plain nested list."""
    return flags_arr.tolist()
