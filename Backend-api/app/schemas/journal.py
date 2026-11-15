"""Pydantic schemas for the Journal and Watchlist endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Journal ──────────────────────────────────────────────────────────────────


class JournalEntryCreate(BaseModel):
    """Payload for creating a new journal entry."""

    ra: float = Field(..., ge=0.0, lt=360.0)
    dec: float = Field(..., ge=-90.0, le=90.0)
    size_deg: float = Field(0.1, ge=0.001, le=1.0)
    label: str | None = Field(None, max_length=256)
    notes: str | None = None


class JournalEntryUpdate(BaseModel):
    """Payload for updating an existing journal entry (all fields optional)."""

    label: str | None = Field(None, max_length=256)
    notes: str | None = None
    size_deg: float | None = Field(None, ge=0.001, le=1.0)


class PredictionCreate(BaseModel):
    """Payload for attaching a ghost prediction to a journal entry."""

    source_id: str
    vx_arcsec_yr: float
    vy_arcsec_yr: float
    predicted_ra: float
    predicted_dec: float
    predicted_epoch: datetime
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_label: str
    n_epochs: int = Field(..., ge=1)


class PredictionRead(PredictionCreate):
    """Full prediction record as stored in the database."""

    id: uuid.UUID
    journal_entry_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class JournalEntryRead(BaseModel):
    """Full journal entry record including nested predictions."""

    id: uuid.UUID
    ra: float
    dec: float
    size_deg: float
    label: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    predictions: list[PredictionRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# ── Watchlist ─────────────────────────────────────────────────────────────────


class WatchlistItemCreate(BaseModel):
    """Payload for adding a source to the watchlist."""

    ra: float = Field(..., ge=0.0, lt=360.0)
    dec: float = Field(..., ge=-90.0, le=90.0)
    label: str | None = Field(None, max_length=256)
    last_flux: float | None = None
    last_epoch: str | None = None


class WatchlistItemRead(WatchlistItemCreate):
    """Full watchlist item record as stored in the database."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
