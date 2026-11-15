"""Pydantic schemas for anomaly data decoded from the SPHEREx anomaly CSV."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AnomalyRecord(BaseModel):
    """A single row from the SPHEREx anomaly CSV, normalised for the API."""

    obsid: str = Field(..., description="Observation ID")
    anomaly_type: str = Field(..., description="Category of the anomaly")
    anomaly_name: str = Field(..., description="Human-readable anomaly description")
    band_1_affected: int = Field(
        ..., ge=0, le=2, description="0=<10%, 1=>90%, 2=10-90% contaminated"
    )
    band_2_affected: int = Field(..., ge=0, le=2)
    band_3_affected: int = Field(..., ge=0, le=2)
    band_4_affected: int = Field(..., ge=0, le=2)
    band_5_affected: int = Field(..., ge=0, le=2)
    band_6_affected: int = Field(..., ge=0, le=2)

    @property
    def any_band_heavily_affected(self) -> bool:
        """Return True if any band has >90% contamination (value == 1)."""
        return any(
            getattr(self, f"band_{i}_affected") == 1 for i in range(1, 7)
        )

    @property
    def severity_label(self) -> str:
        """Human-readable severity: 'severe', 'partial', or 'minor'."""
        vals = [getattr(self, f"band_{i}_affected") for i in range(1, 7)]
        if 1 in vals:
            return "severe"
        if 2 in vals:
            return "partial"
        return "minor"
