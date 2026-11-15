"""Pydantic schemas for motion detection, proper motion, and ghost prediction."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class EpochPosition(BaseModel):
    """Source position measured at a single epoch."""

    epoch: datetime
    x_pix: float
    y_pix: float
    ra: float
    dec: float
    flux: float
    snr: float


class MovingSource(BaseModel):
    """A source with a measurable proper-motion vector across epochs."""

    source_id: str = Field(..., description="Internal source identifier")
    ra_initial: float = Field(..., description="RA at first epoch (degrees)")
    dec_initial: float = Field(..., description="Dec at first epoch (degrees)")
    positions: list[EpochPosition] = Field(
        ..., description="Measured positions across all epochs"
    )
    # Motion in arcsec/year
    vx_arcsec_yr: float
    vy_arcsec_yr: float
    vx_err: float
    vy_err: float
    proper_motion_arcsec_yr: float = Field(
        ..., description="Total proper-motion magnitude (arcsec/yr)"
    )
    n_epochs: int
    snr: float


class MotionResponse(BaseModel):
    """Response from the /motion/detect endpoint."""

    ra: float
    dec: float
    size_deg: float
    moving_sources: list[MovingSource]
    n_sources_detected: int = Field(..., description="Total sources found across epochs")
    n_moving: int = Field(..., description="Sources with significant proper motion")


class GhostPrediction(BaseModel):
    """Predicted future position of a moving source."""

    source_id: str
    # Current (last-measured) position
    current_ra: float
    current_dec: float
    current_epoch: datetime
    # Predicted position
    predicted_ra: float
    predicted_dec: float
    predicted_epoch: datetime
    # Motion vector
    vx_arcsec_yr: float
    vy_arcsec_yr: float
    proper_motion_arcsec_yr: float
    # Confidence
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_label: str = Field(
        ..., description="Human label: 'high', 'medium', or 'low'"
    )
    n_epochs_used: int
    fit_residual_arcsec: float
