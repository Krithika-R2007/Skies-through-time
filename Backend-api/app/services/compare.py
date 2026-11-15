"""Epoch comparison and change detection service."""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class DifferenceCandidate:
    ra: float
    dec: float
    x_pix: float
    y_pix: float
    snr: float
    dipole_score: float
    is_moving_candidate: bool


@dataclass
class CompareResult:
    obsid_a: str
    obsid_b: str
    n_changes: int
    change_candidates: list[DifferenceCandidate]
    png_a: bytes
    png_b: bytes
    png_diff: bytes


def _extract_first_plane(hdul) -> np.ndarray:
    """Return the first 2D image plane from an HDUList."""
    try:
        data = hdul["IMAGE"].data
    except (KeyError, AttributeError):
        data = hdul[0].data

    if data is None:
        return np.zeros((64, 64), dtype=np.float64)

    data = np.array(data, dtype=np.float64)
    while data.ndim > 2:
        data = data[0]
    return np.nan_to_num(data, nan=0.0)


def _to_uint8(image: np.ndarray) -> np.ndarray:
    """ZScale stretch a 2D float array to uint8."""
    from astropy.visualization import ZScaleInterval  # noqa: PLC0415

    interval = ZScaleInterval()
    vmin, vmax = interval.get_limits(image)
    stretched = np.clip((image - vmin) / (vmax - vmin + 1e-10), 0, 1)
    return (stretched * 255).astype(np.uint8)


def _make_greyscale_png(image: np.ndarray) -> bytes:
    """Return a greyscale PNG from a float image."""
    from PIL import Image  # noqa: PLC0415

    pixel_array = _to_uint8(image)
    img = Image.fromarray(pixel_array, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_diff_png(diff: np.ndarray) -> bytes:
    """Return a colour PNG: blue = positive diff, red = negative diff."""
    from PIL import Image  # noqa: PLC0415

    sigma = diff.std() + 1e-10
    norm = np.clip(diff / (4 * sigma), -1, 1)

    h, w = diff.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    # Positive: blue channel
    pos = np.clip(norm, 0, 1)
    rgb[:, :, 2] = (pos * 255).astype(np.uint8)
    # Negative: red channel
    neg = np.clip(-norm, 0, 1)
    rgb[:, :, 0] = (neg * 255).astype(np.uint8)

    img = Image.fromarray(rgb, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _find_changes(
    diff: np.ndarray,
    image_a: np.ndarray,
    image_b: np.ndarray,
    wcs_a=None,
    threshold: float = 4.0,
) -> list[DifferenceCandidate]:
    """Find pixels where |diff| > threshold sigma."""
    sigma = diff.std() + 1e-10
    limit = threshold * sigma
    significant = np.abs(diff) > limit

    from scipy.ndimage import label as _label  # type: ignore[import]
    labeled, n_features = _label(significant)

    candidates: list[DifferenceCandidate] = []
    for feat in range(1, n_features + 1):
        ys, xs = np.where(labeled == feat)
        cx = float(xs.mean())
        cy = float(ys.mean())
        peak_diff = float(diff[ys, xs].mean())
        snr = abs(peak_diff) / sigma

        # Dipole score: check if there is a positive/negative pair nearby
        patch = diff[
            max(0, int(cy) - 3): int(cy) + 4,
            max(0, int(cx) - 3): int(cx) + 4,
        ]
        dipole_score = float(patch.max() - patch.min()) / sigma if patch.size else 0.0
        is_moving = dipole_score > 2.0

        ra, dec = cx, cy
        if wcs_a is not None:
            try:
                world = wcs_a.all_pix2world([[cx, cy]], 0)
                ra, dec = float(world[0][0]), float(world[0][1])
            except Exception:
                pass

        candidates.append(
            DifferenceCandidate(
                ra=ra,
                dec=dec,
                x_pix=cx,
                y_pix=cy,
                snr=snr,
                dipole_score=dipole_score,
                is_moving_candidate=is_moving,
            )
        )

    candidates.sort(key=lambda c: abs(c.dipole_score), reverse=True)
    return candidates


def _find_changes_numpy(
    diff: np.ndarray,
    threshold: float,
    wcs_a=None,
) -> list[DifferenceCandidate]:
    """Fallback change detection without scipy."""
    sigma = diff.std() + 1e-10
    limit = threshold * sigma

    ys, xs = np.where(np.abs(diff) > limit)
    if len(xs) == 0:
        return []

    # Cluster nearby pixels naively
    visited = set()
    candidates: list[DifferenceCandidate] = []

    for y, x in zip(ys.tolist(), xs.tolist()):
        key = (y // 5, x // 5)
        if key in visited:
            continue
        visited.add(key)

        cx, cy = float(x), float(y)
        peak_diff = float(diff[y, x])
        snr = abs(peak_diff) / sigma
        dipole_score = snr
        is_moving = snr > 3.0

        ra, dec = cx, cy
        if wcs_a is not None:
            try:
                world = wcs_a.all_pix2world([[cx, cy]], 0)
                ra, dec = float(world[0][0]), float(world[0][1])
            except Exception:
                pass

        candidates.append(
            DifferenceCandidate(
                ra=ra, dec=dec, x_pix=cx, y_pix=cy,
                snr=snr, dipole_score=dipole_score,
                is_moving_candidate=is_moving,
            )
        )

    candidates.sort(key=lambda c: abs(c.dipole_score), reverse=True)
    return candidates[:50]


async def compare_epochs(
    hdul_a,
    hdul_b,
    obsid_a: str,
    obsid_b: str,
    detection_threshold: float = 4.0,
) -> CompareResult:
    """Compare two SPHEREx FITS epochs and return PNGs + change list.

    Args:
        hdul_a: Reference (older) HDUList.
        hdul_b: Science (newer) HDUList.
        obsid_a: Label for epoch A.
        obsid_b: Label for epoch B.
        detection_threshold: Sigma threshold for change detection.

    Returns:
        CompareResult with three PNGs and detected changes.
    """
    img_a = _extract_first_plane(hdul_a)
    img_b = _extract_first_plane(hdul_b)

    # Align sizes (crop to smaller)
    h = min(img_a.shape[0], img_b.shape[0])
    w = min(img_a.shape[1], img_b.shape[1])
    img_a = img_a[:h, :w]
    img_b = img_b[:h, :w]

    diff = img_b - img_a

    # WCS from epoch A for coordinate conversion
    wcs_a = None
    try:
        from astropy.wcs import WCS  # noqa: PLC0415
        wcs_a = WCS(hdul_a["IMAGE"].header)
    except Exception:
        pass

    # Detect changes
    try:
        from scipy.ndimage import label as _  # noqa: F401, PLC0415
        candidates = _find_changes(diff, img_a, img_b, wcs_a, detection_threshold)
    except ImportError:
        candidates = _find_changes_numpy(diff, detection_threshold, wcs_a)

    png_a = _make_greyscale_png(img_a)
    png_b = _make_greyscale_png(img_b)
    png_diff = _make_diff_png(diff)

    return CompareResult(
        obsid_a=obsid_a,
        obsid_b=obsid_b,
        n_changes=len(candidates),
        change_candidates=candidates,
        png_a=png_a,
        png_b=png_b,
        png_diff=png_diff,
    )


async def multi_epoch_changes(
    hduls: list,
    obsids: list[str],
    detection_threshold: float = 4.0,
) -> list[DifferenceCandidate]:
    """Run pairwise comparisons on consecutive epoch pairs.

    Args:
        hduls: List of HDULists in chronological order.
        obsids: Matching OBSID labels.
        detection_threshold: Sigma threshold.

    Returns:
        Merged, deduplicated change candidates sorted by |dipole_score|.
    """
    all_candidates: list[DifferenceCandidate] = []

    for i in range(len(hduls) - 1):
        try:
            result = await compare_epochs(
                hduls[i],
                hduls[i + 1],
                obsids[i],
                obsids[i + 1],
                detection_threshold=detection_threshold,
            )
            all_candidates.extend(result.change_candidates)
        except Exception as exc:
            logger.warning("Epoch comparison %s→%s failed: %s", obsids[i], obsids[i + 1], exc)

    # Deduplicate by grid cell (~5-pixel grid)
    seen: set[tuple[int, int]] = set()
    deduped: list[DifferenceCandidate] = []
    for cand in all_candidates:
        key = (int(cand.x_pix // 5), int(cand.y_pix // 5))
        if key not in seen:
            seen.add(key)
            deduped.append(cand)

    deduped.sort(key=lambda c: abs(c.dipole_score), reverse=True)
    return deduped
