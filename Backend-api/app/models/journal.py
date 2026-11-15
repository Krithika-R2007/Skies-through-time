"""SQLAlchemy ORM models for the Journal, Predictions, and Watchlist."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class JournalEntry(Base):
    __tablename__ = "journal_entry"

    id: Mapped[uuid.UUID] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ra: Mapped[float] = mapped_column(Float, nullable=False)
    dec: Mapped[float] = mapped_column(Float, nullable=False)
    size_deg: Mapped[float] = mapped_column(Float, default=0.1)
    label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    predictions: Mapped[list[Prediction]] = relationship(
        "Prediction",
        back_populates="journal_entry",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Prediction(Base):
    __tablename__ = "prediction"

    id: Mapped[uuid.UUID] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    journal_entry_id: Mapped[uuid.UUID] = mapped_column(
        String(36),
        ForeignKey("journal_entry.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_id: Mapped[str] = mapped_column(String(256), nullable=False)
    vx_arcsec_yr: Mapped[float] = mapped_column(Float, nullable=False)
    vy_arcsec_yr: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_ra: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_dec: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_epoch: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_label: Mapped[str] = mapped_column(String(32), nullable=False)
    n_epochs: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    journal_entry: Mapped[JournalEntry] = relationship(
        "JournalEntry", back_populates="predictions"
    )


class WatchlistItem(Base):
    __tablename__ = "watchlist_item"

    id: Mapped[uuid.UUID] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ra: Mapped[float] = mapped_column(Float, nullable=False)
    dec: Mapped[float] = mapped_column(Float, nullable=False)
    label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    last_flux: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_epoch: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
