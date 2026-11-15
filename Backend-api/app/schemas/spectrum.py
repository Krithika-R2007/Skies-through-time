"""Pydantic schemas for the on-the-fly spectrum endpoint."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SpectralPoint(BaseModel):
    """Flux measurement at a single spectral plane."""

    wavelength_um: float = Field(..., description="Central wavelength (micrometres)")
    flux_mjy_sr: float = Field(..., description="Aperture flux (MJy/sr)")
    flux_error_mjy_sr: float = Field(..., description="Propagated flux uncertainty")


class SpectrumResponse(BaseModel):
    """On-the-fly spectrum response payload."""

    ra: float
    dec: float
    obsid: str
    bandpass_id: str
    n_planes: int = Field(..., description="Number of spectral planes measured")
    points: list[SpectralPoint] = Field(..., description="Spectrum data points")
    quick_look: bool = Field(
        True,
        description="Always True — this is aperture photometry, not pipeline extraction",
    )
    note: str = Field(
        "Approximate photometry; not a replacement for IRSA's full spectrophotometry tool.",
        description="Disclaimer required by the data specification",
    )
