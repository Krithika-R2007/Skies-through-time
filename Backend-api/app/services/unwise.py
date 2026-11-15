"""unWISE / NEOWISE multi-epoch infrared service."""

from __future__ import annotations

import gzip
import io
import logging
import tarfile
from dataclasses import dataclass

import httpx
import numpy as np

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(60.0)

# Epoch version → (date label, representative MJD midpoint, wavelength µm per band)
_EPOCH_META: dict[str, dict] = {
    "neo1": {"date_label": "2010–2011", "mjd_mid": 55950},
    "neo2": {"date_label": "2012–2013", "mjd_mid": 56595},
    "neo3": {"date_label": "2014",      "mjd_mid": 57010},
    "neo4": {"date_label": "2015–2016", "mjd_mid": 57388},
    "neo5": {"date_label": "2016–2017", "mjd_mid": 57940},
    "neo6": {"date_label": "2017–2018", "mjd_mid": 58340},
    "neo7": {"date_label": "2018",      "mjd_mid": 58550},
}

_BAND_WAVELENGTH = {1: 3.4, 2: 4.6}

# Small in-process cache so listing epochs and then fetching their images downloads once.
_EPOCH_CACHE: dict[tuple, "UnWISEEpoch"] = {}


@dataclass
class UnWISEEpoch:
    version: str
    band: int
    date_label: str
    wavelength_um: float
    mjd_mid: float
    shape: tuple[int, int]
    image_data: np.ndarray


@dataclass
class UnWISEFrame:
    version: str
    band: int
    date_label: str
    wavelength_um: float
    mjd_mid: float
    shape: tuple[int, int]


async def fetch_unwise_epoch(
    ra: float,
    dec: float,
    version: str,
    band: int = 1,
    size_px: int = 100,
) -> UnWISEEpoch | None:
    """Download one unWISE epoch as a numpy image array.

    Args:
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        version: Epoch version (neo1–neo7).
        band: WISE band (1=W1 3.4µm, 2=W2 4.6µm).
        size_px: Cutout size in pixels.

    Returns:
        UnWISEEpoch or None on failure.
    """
    cache_key = (round(ra, 5), round(dec, 5), version, band, size_px)
    cached = _EPOCH_CACHE.get(cache_key)
    if cached is not None:
        return cached
    meta = _EPOCH_META.get(version, {"date_label": version, "mjd_mid": 0.0})
    url = (
        f"https://unwise.me/cutout_fits"
        f"?version={version}&ra={ra}&dec={dec}&size={size_px}&bands={band}"
    )
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            raw = resp.content

        image_data = _extract_fits_from_tarball(raw)
        if image_data is None:
            return None

        h, w = image_data.shape
        epoch = UnWISEEpoch(
            version=version,
            band=band,
            date_label=meta["date_label"],
            wavelength_um=_BAND_WAVELENGTH.get(band, 3.4),
            mjd_mid=meta["mjd_mid"],
            shape=(h, w),
            image_data=image_data,
        )
        if len(_EPOCH_CACHE) >= 200:
            _EPOCH_CACHE.pop(next(iter(_EPOCH_CACHE)))
        _EPOCH_CACHE[cache_key] = epoch
        return epoch
    except Exception as exc:
        logger.warning("unWISE fetch failed for %s band%d: %s", version, band, exc)
        return None


def _extract_fits_from_tarball(raw: bytes) -> np.ndarray | None:
    """Extract the first FITS image from a gzip tarball returned by unwise.me."""
    from astropy.io import fits  # noqa: PLC0415

    try:
        # unwise.me returns a gzip tarball
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tar:
            for member in tar.getmembers():
                if member.name.endswith(".fits"):
                    f = tar.extractfile(member)
                    if f is None:
                        continue
                    hdul = fits.open(io.BytesIO(f.read()))
                    for hdu in hdul:
                        if hasattr(hdu, "data") and hdu.data is not None:
                            data = np.array(hdu.data, dtype=np.float64)
                            # Take first plane if 3D
                            while data.ndim > 2:
                                data = data[0]
                            return data
    except Exception:
        pass

    # Fallback: try interpreting as a plain gzip FITS
    try:
        with gzip.open(io.BytesIO(raw)) as gz:
            hdul = fits.open(io.BytesIO(gz.read()))
            for hdu in hdul:
                if hasattr(hdu, "data") and hdu.data is not None:
                    data = np.array(hdu.data, dtype=np.float64)
                    while data.ndim > 2:
                        data = data[0]
                    return data
    except Exception:
        pass

    # Last resort: try as plain FITS
    try:
        hdul = fits.open(io.BytesIO(raw))
        for hdu in hdul:
            if hasattr(hdu, "data") and hdu.data is not None:
                data = np.array(hdu.data, dtype=np.float64)
                while data.ndim > 2:
                    data = data[0]
                return data
    except Exception:
        pass

    return None


async def fetch_unwise_blink_frames(
    ra: float,
    dec: float,
    band: int = 1,
    size_px: int = 100,
) -> list[UnWISEFrame]:
    """Fetch metadata for all 7 unWISE epochs concurrently.

    Downloads each epoch and returns UnWISEFrame metadata for successful ones.
    """
    import asyncio  # noqa: PLC0415

    versions = list(_EPOCH_META.keys())
    epochs = await asyncio.gather(
        *[fetch_unwise_epoch(ra, dec, v, band=band, size_px=size_px) for v in versions],
        return_exceptions=True,
    )

    frames: list[UnWISEFrame] = []
    for epoch in epochs:
        if isinstance(epoch, UnWISEEpoch):
            frames.append(
                UnWISEFrame(
                    version=epoch.version,
                    band=epoch.band,
                    date_label=epoch.date_label,
                    wavelength_um=epoch.wavelength_um,
                    mjd_mid=epoch.mjd_mid,
                    shape=epoch.shape,
                )
            )
    return frames


UNWISE_ARCSEC_PER_PX = 2.75


def _smooth3(x: np.ndarray) -> np.ndarray:
    """3x3 box smoothing (edge-padded) to suppress single-pixel noise."""
    p = np.pad(x, 1, mode="edge")
    return sum(p[i:i + x.shape[0], j:j + x.shape[1]] for i in range(3) for j in range(3)) / 9.0


def _local_peaks(score: np.ndarray, threshold: float, radius: int = 2) -> list[tuple[int, int]]:
    """(row, col) of pixels above *threshold* that are the maximum of their neighbourhood."""
    from numpy.lib.stride_tricks import sliding_window_view  # noqa: PLC0415

    w = 2 * radius + 1
    padded = np.pad(score, radius, mode="constant", constant_values=-np.inf)
    local_max = sliding_window_view(padded, (w, w)).max(axis=(-1, -2))
    rows, cols = np.where((score >= threshold) & (score == local_max))
    return list(zip(rows.tolist(), cols.tolist()))


def _robust_sigma(x: np.ndarray) -> float:
    return float(1.4826 * np.median(np.abs(x - np.median(x)))) or 1e-9


def _measure(img: np.ndarray, r: int, c: int, h: int = 3):
    """Flux-weighted centroid, aperture flux and saturation flag in a (2h+1)^2 box."""
    ny, nx = img.shape
    r0, r1, c0, c1 = max(0, r - h), min(ny, r + h + 1), max(0, c - h), min(nx, c + h + 1)
    box = img[r0:r1, c0:c1]
    w = np.clip(box, 0, None)
    tot = float(w.sum())
    if tot <= 0:
        return None
    rr, cc = np.mgrid[r0:r1, c0:c1]
    peak = float(box.max())
    # A normal NEOWISE star has 1-3 pixels near its peak; saturated cores are flat or hollow.
    saturated = int((box >= 0.9 * peak).sum()) > 6 or peak < float(box[min(h, box.shape[0] - 1), min(h, box.shape[1] - 1)]) * 0.5
    return float((rr * w).sum() / tot), float((cc * w).sum() / tot), tot, saturated, (r1 - r0) * (c1 - c0)


def find_epoch_changes(
    img_a: np.ndarray,
    img_b: np.ndarray,
    years_between: float,
    threshold: float = 5.0,
    max_results: int = 5,
) -> list[dict]:
    """Measure which sources moved or changed brightness from image A to image B.

    Sources are detected in both images, matched by position, and compared by their
    flux-weighted centroid and aperture flux. Saturated stars are skipped because their
    centroids and fluxes are unreliable. Positions are fractions of the frame image
    (0..1, row 0 at the top, matching the PNG served by /unwise/blink/frame).
    """
    ny = min(img_a.shape[0], img_b.shape[0])
    nx = min(img_a.shape[1], img_b.shape[1])
    a = np.nan_to_num(img_a[:ny, :nx].astype(np.float64))
    b = np.nan_to_num(img_b[:ny, :nx].astype(np.float64))
    a -= np.median(a)
    b -= np.median(b)
    sa, sb = _robust_sigma(a), _robust_sigma(b)

    det_thr = max(threshold * 2, 10.0)  # only well-measured sources

    def sources(img: np.ndarray, s: float) -> list[tuple[int, int]]:
        sm = _smooth3(img) / s
        pk = _local_peaks(sm, det_thr, radius=3)
        pk.sort(key=lambda p: -sm[p])
        return pk[:80]

    src_a, src_b = sources(a, sa), sources(b, sb)
    used_b: set[int] = set()
    results: list[dict] = []

    def fx(c: float) -> float:
        return (c + 0.5) / nx

    def fy(r: float) -> float:
        # Frame PNGs are flipped so north is up; row 0 of the FITS data is at the bottom.
        return 1.0 - (r + 0.5) / ny

    for (ra_, ca_) in src_a:
        ma = _measure(a, ra_, ca_)
        if ma is None or ma[3]:
            continue
        # Nearest unused detection in B within 12 px (~33 arcsec).
        best, best_d = None, 12.0
        for j, (rb_, cb_) in enumerate(src_b):
            if j in used_b:
                continue
            d = float(np.hypot(rb_ - ra_, cb_ - ca_))
            if d < best_d:
                best, best_d = j, d
        if best is not None:
            used_b.add(best)
            mb = _measure(b, *src_b[best])
        else:
            mb = _measure(b, ra_, ca_)  # same spot: did it fade away?
        if mb is None or mb[3]:
            continue

        fa, fb = ma[2], mb[2]
        noise = np.hypot(sa, sb) * np.sqrt(ma[4])
        ratio = fb / fa if fa > 0 else np.inf
        shift_px = float(np.hypot(mb[0] - ma[0], mb[1] - ma[1]))
        snr = float(min(fa, max(fb, 0)) / noise) if noise > 0 else 0.0

        if best is not None and shift_px >= 1.5 and 0.6 <= ratio <= 1.67 and snr >= 20:
            shift = shift_px * UNWISE_ARCSEC_PER_PX
            results.append({
                "kind": "moved", "x": fx(mb[1]), "y": fy(mb[0]),
                "from_x": fx(ma[1]), "from_y": fy(ma[0]),
                "snr": round(snr, 1), "shift_arcsec": round(shift, 1),
                "rate_arcsec_yr": round(shift / years_between, 2) if years_between > 0 else None,
            })
        elif abs(fb - fa) >= threshold * noise and abs(ratio - 1) >= 0.3:
            kind = "brightened" if fb > fa else "faded"
            results.append({
                "kind": kind, "x": fx(mb[1] if best is not None else ma[1]), "y": fy(mb[0] if best is not None else ma[0]),
                "snr": round(abs(fb - fa) / noise, 1),
                "change_pct": round(100 * (fb - fa) / fa),
            })

    # Sources that appear in B with nothing at that spot in A.
    for j, (rb_, cb_) in enumerate(src_b):
        if j in used_b:
            continue
        mb = _measure(b, rb_, cb_)
        ma = _measure(a, rb_, cb_)
        if mb is None or mb[3]:
            continue
        fa = ma[2] if ma else 0.0
        noise = np.hypot(sa, sb) * np.sqrt(mb[4])
        if mb[2] - fa >= threshold * noise and (fa <= 0 or mb[2] / fa >= 1.3):
            results.append({
                "kind": "brightened", "x": fx(mb[1]), "y": fy(mb[0]),
                "snr": round((mb[2] - fa) / noise, 1),
                "change_pct": round(100 * (mb[2] - fa) / fa) if fa > 0 else None,
            })

    results.sort(key=lambda x: (x["kind"] != "moved", -x["snr"]))

    # One physical event should get one marker. A moving source also leaves a faded spot
    # where it was and a brighter spot where it arrived, and bright movers can be matched
    # more than once; fold anything close to a stronger mover into that mover.
    merge_r = 0.06
    kept: list[dict] = []
    for r in results:
        near = False
        for k in kept:
            if k["kind"] != "moved":
                continue
            pts = [(k["x"], k["y"]), (k["from_x"], k["from_y"])]
            rp = [(r["x"], r["y"])] + ([(r["from_x"], r["from_y"])] if r["kind"] == "moved" else [])
            # Faded/brightened halves of a move can sit further out than the measured
            # shift, because centroids of bright stars underestimate it.
            lim = merge_r if r["kind"] == "moved" else 2 * merge_r
            if any(np.hypot(px - qx, py - qy) < lim for px, py in rp for qx, qy in pts):
                near = True
                break
        if not near:
            kept.append(r)
    return kept[:max_results]

def diff_to_png(img_a: np.ndarray, img_b: np.ndarray) -> bytes:
    """B − A as an RGB PNG: blue = brighter in B, red = fainter in B, black = no change.

    The stretch is set by the difference-image noise (clipped at ±12σ, or the 99.7th
    percentile if larger), so noise stays dark and real changes stand out.
    """
    from PIL import Image  # noqa: PLC0415

    ny = min(img_a.shape[0], img_b.shape[0])
    nx = min(img_a.shape[1], img_b.shape[1])
    a = np.nan_to_num(img_a[:ny, :nx].astype(np.float64))
    b = np.nan_to_num(img_b[:ny, :nx].astype(np.float64))
    d = (b - np.median(b)) - (a - np.median(a))
    sigma = _robust_sigma(d)
    lim = max(12 * sigma, float(np.percentile(np.abs(d), 99.7)), 1e-9)
    # Ignore the noise floor (below 2 sigma) so the background stays black.
    s = np.clip((np.abs(d) - 2 * sigma) / (lim - 2 * sigma + 1e-12), 0, 1) ** 0.6
    rgb = np.zeros((ny, nx, 3), dtype=np.float64)
    pos, neg = d > 0, d < 0
    rgb[..., 0] = np.where(neg, s * 255, s * 40)
    rgb[..., 1] = np.where(pos, s * 170, s * 60)
    rgb[..., 2] = np.where(pos, s * 255, s * 40)
    buf = io.BytesIO()
    # Flip so north is up, matching the frame PNGs and the change positions.
    Image.fromarray(np.flipud(rgb).astype(np.uint8), mode="RGB").save(buf, format="PNG")
    return buf.getvalue()


def _image_to_png(image_data: np.ndarray) -> bytes:
    """Convert a 2D numpy array to PNG bytes using ZScale stretch.

    Args:
        image_data: 2D float array.

    Returns:
        PNG bytes.
    """
    from PIL import Image  # noqa: PLC0415
    from astropy.visualization import ZScaleInterval  # noqa: PLC0415

    data = np.nan_to_num(image_data.astype(np.float64), nan=0.0)
    interval = ZScaleInterval()
    vmin, vmax = interval.get_limits(data)
    stretched = np.clip((data - vmin) / (vmax - vmin + 1e-10), 0, 1)
    pixel_array = (stretched * 255).astype(np.uint8)
    # FITS rows run bottom-up; flip so north is up (same as the SPHEREx images).
    img = Image.fromarray(np.flipud(pixel_array), mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
