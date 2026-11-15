"""Pydantic schemas for Sky Card and cutout endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CutoutInfo(BaseModel):
    """Metadata for a single SPHEREx cutout image."""

    obsid: str = Field(..., description="Observation ID from IRSA obscore")
    bandpass_id: str = Field(..., description="Spectral bandpass identifier")
    epoch_timestamp: datetime | None = Field(
        None, description="UTC observation time (time_bounds_lower)"
    )
    cutout_url: str = Field(..., description="IRSA cutout URL for this observation")
    anomaly_flags: list[AnomalyFlag] = Field(
        default_factory=list,
        description="Any anomaly warnings attached to this OBSID",
    )


class AnomalyFlag(BaseModel):
    """A single anomaly warning decoded from the SPHEREx anomaly CSV."""

    obsid: str
    anomaly_type: str
    anomaly_name: str
    band_1_affected: int = Field(..., ge=0, le=2)
    band_2_affected: int = Field(..., ge=0, le=2)
    band_3_affected: int = Field(..., ge=0, le=2)
    band_4_affected: int = Field(..., ge=0, le=2)
    band_5_affected: int = Field(..., ge=0, le=2)
    band_6_affected: int = Field(..., ge=0, le=2)


class SkyCardRequest(BaseModel):
    """Query parameters for the Sky Card endpoint."""

    ra: float = Field(..., ge=0.0, lt=360.0, description="Right Ascension (degrees)")
    dec: float = Field(..., ge=-90.0, le=90.0, description="Declination (degrees)")
    size: float = Field(
        0.1, ge=0.001, le=1.0, description="Search radius / cutout size (degrees)"
    )


class SkyCardResponse(BaseModel):
    """Full sky card payload returned to the frontend."""

    ra: float
    dec: float
    size_deg: float
    n_epochs: int = Field(..., description="Number of distinct epochs found")
    epoch_range: tuple[datetime, datetime] | None = Field(
        None, description="(earliest, latest) observation timestamps"
    )
    cutouts: list[CutoutInfo] = Field(
        ..., description="Sorted list of cutout metadata (oldest → newest)"
    )
    narrative: str = Field(
        ...,
        description=(
            "Human-readable summary of what was found "
            "(sources, changes, anomaly warnings)"
        ),
    )
