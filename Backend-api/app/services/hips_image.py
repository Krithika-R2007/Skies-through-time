"""HiPS cube FITS channel extraction using HTTP range requests.

A SPHEREx HiPS tile is a ~320 MB FITS file: an empty primary HDU followed by an IMAGE
extension holding a (102, ny, nx) float32 cube. Only the requested 1 MiB plane is fetched.
"""
from __future__ import annotations

import io
import logging

import httpx
import numpy as np

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(45.0)
_N_CHANNELS = 102
_BLOCK = 2880
_CARD = 80

# url -> (data_offset, nx, ny, nchan, bitpix); and (url, channel) -> png
_LAYOUT_CACHE: dict[str, tuple[int, int, int, int, int]] = {}
_PNG_CACHE: dict[tuple[str, int], bytes] = {}


def _wavelength(channel: int) -> float:
    return round(0.75 + channel * (5.0 - 0.75) / 101, 4)


async def hips_channel_metadata(url: str) -> list[dict]:
    """Return the pre-computed wavelength table, no download needed."""
    return [{"channel": i, "wavelength_um": _wavelength(i)} for i in range(_N_CHANNELS)]


def _read_header(raw: bytes, start: int) -> tuple[dict, int]:
    """Parse one FITS header beginning at *start*. Returns (cards, offset after header)."""
    header: dict = {}
    off = start
    while off + _BLOCK <= len(raw):
        block = raw[off: off + _BLOCK]
        off += _BLOCK
        for i in range(_BLOCK // _CARD):
            card = block[i * _CARD: (i + 1) * _CARD].decode("ascii", errors="replace")
            key = card[:8].strip()
            if key == "END":
                return header, off
            if card[8:9] == "=":
                header[key] = card[10:].split("/")[0].strip().strip("'").strip()
    raise ValueError("FITS header not terminated within the fetched bytes")


def _data_bytes(h: dict) -> int:
    nax = int(h.get("NAXIS", 0))
    if nax == 0:
        return 0
    size = 1
    for i in range(1, nax + 1):
        size *= int(h[f"NAXIS{i}"])
    return abs(int(h["BITPIX"])) // 8 * size


async def _range_get(url: str, start: int, end: int) -> bytes:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(url, headers={"Range": f"bytes={start}-{end}"})
        if resp.status_code not in (200, 206):
            resp.raise_for_status()
        if resp.status_code == 200 and len(resp.content) > (end - start + 1):
            raise ValueError("Server ignored the Range request; refusing to download the whole cube")
        return resp.content


async def _layout(url: str) -> tuple[int, int, int, int, int]:
    cached = _LAYOUT_CACHE.get(url)
    if cached:
        return cached
    raw = await _range_get(url, 0, 4 * _BLOCK * 4 - 1)
    primary, off = _read_header(raw, 0)
    off += (_data_bytes(primary) + _BLOCK - 1) // _BLOCK * _BLOCK
    ext, data_off = _read_header(raw, off)
    layout = (
        data_off,
        int(ext["NAXIS1"]),
        int(ext["NAXIS2"]),
        int(ext.get("NAXIS3", 1)),
        int(ext["BITPIX"]),
    )
    _LAYOUT_CACHE[url] = layout
    return layout


async def fetch_hips_channel_png(url: str, channel: int) -> tuple[bytes, float]:
    """Return (png_bytes, wavelength_um) for one channel of a HiPS cube tile."""
    from PIL import Image  # noqa: PLC0415
    from astropy.visualization import ZScaleInterval  # noqa: PLC0415

    channel = max(0, min(_N_CHANNELS - 1, channel))
    wavelength_um = _wavelength(channel)
    cached = _PNG_CACHE.get((url, channel))
    if cached:
        return cached, wavelength_um

    data_off, nx, ny, nchan, bitpix = await _layout(url)
    channel = min(channel, nchan - 1)
    bpp = abs(bitpix) // 8
    plane = nx * ny * bpp
    start = data_off + channel * plane
    raw = await _range_get(url, start, start + plane - 1)
    dtype = ">f4" if bitpix == -32 else ">f8"
    image = np.frombuffer(raw, dtype=dtype).astype(np.float64).reshape(ny, nx)
    image = np.nan_to_num(image, nan=0.0, posinf=0.0, neginf=0.0)

    vmin, vmax = ZScaleInterval().get_limits(image)
    stretched = np.clip((image - vmin) / (vmax - vmin + 1e-10), 0, 1)
    # FITS rows run bottom-up; flip so north is up.
    pixels = np.flipud((stretched * 255).astype(np.uint8))
    buf = io.BytesIO()
    Image.fromarray(pixels, mode="L").save(buf, format="PNG")
    png = buf.getvalue()
    if len(_PNG_CACHE) >= 300:
        _PNG_CACHE.pop(next(iter(_PNG_CACHE)))
    _PNG_CACHE[(url, channel)] = png
    return png, wavelength_um