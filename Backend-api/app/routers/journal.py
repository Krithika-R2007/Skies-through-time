"""Journal and Watchlist CRUD endpoints.

Journal:
  GET    /journal        – list all entries
  POST   /journal        – create a new entry
  GET    /journal/{id}   – get a single entry
  PUT    /journal/{id}   – update an entry
  DELETE /journal/{id}   – delete an entry
  POST   /journal/{id}/prediction – attach a ghost prediction

Watchlist:
  GET    /watchlist      – list all watchlist items
  POST   /watchlist      – add an item
  DELETE /watchlist/{id} – remove an item
"""

from __future__ import annotations

import uuid
import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.dependencies import DbSession
from app.models.journal import JournalEntry, Prediction, WatchlistItem
from app.schemas.journal import (
    JournalEntryCreate,
    JournalEntryRead,
    JournalEntryUpdate,
    PredictionCreate,
    PredictionRead,
    WatchlistItemCreate,
    WatchlistItemRead,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["journal"])


# ── Journal ──────────────────────────────────────────────────────────────────


@router.get("/journal", response_model=list[JournalEntryRead], summary="List journal entries")
async def list_journal(db: DbSession) -> list[JournalEntry]:
    """Return all journal entries ordered by creation time (newest first).

    Args:
        db: Injected async database session.

    Returns:
        List of JournalEntryRead objects.
    """
    result = await db.execute(
        select(JournalEntry).order_by(JournalEntry.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/journal",
    response_model=JournalEntryRead,
    status_code=201,
    summary="Create a journal entry",
)
async def create_journal(payload: JournalEntryCreate, db: DbSession) -> JournalEntry:
    """Create a new journal entry for a sky region.

    Args:
        payload: JournalEntryCreate body.
        db: Injected async database session.

    Returns:
        The newly created JournalEntryRead.
    """
    entry = JournalEntry(**payload.model_dump())
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    logger.info("Created journal entry id=%s ra=%.4f dec=%.4f", entry.id, entry.ra, entry.dec)
    return entry


@router.get(
    "/journal/{entry_id}",
    response_model=JournalEntryRead,
    summary="Get a journal entry",
)
async def get_journal_entry(entry_id: uuid.UUID, db: DbSession) -> JournalEntry:
    """Return a single journal entry by ID.

    Args:
        entry_id: UUID of the journal entry.
        db: Injected async database session.

    Returns:
        JournalEntryRead with nested predictions.

    Raises:
        HTTPException 404: If the entry does not exist.
    """
    entry = await db.get(JournalEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return entry


@router.put(
    "/journal/{entry_id}",
    response_model=JournalEntryRead,
    summary="Update a journal entry",
)
async def update_journal_entry(
    entry_id: uuid.UUID,
    payload: JournalEntryUpdate,
    db: DbSession,
) -> JournalEntry:
    """Update label, notes, or size_deg on an existing journal entry.

    Args:
        entry_id: UUID of the entry to update.
        payload: JournalEntryUpdate (all fields optional).
        db: Injected async database session.

    Returns:
        Updated JournalEntryRead.

    Raises:
        HTTPException 404: If the entry does not exist.
    """
    entry = await db.get(JournalEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.flush()
    await db.refresh(entry)
    return entry


@router.delete(
    "/journal/{entry_id}",
    status_code=204,
    summary="Delete a journal entry",
)
async def delete_journal_entry(entry_id: uuid.UUID, db: DbSession) -> None:
    """Delete a journal entry and all its associated predictions.

    Args:
        entry_id: UUID of the entry to delete.
        db: Injected async database session.

    Raises:
        HTTPException 404: If the entry does not exist.
    """
    entry = await db.get(JournalEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    await db.delete(entry)
    logger.info("Deleted journal entry id=%s", entry_id)


@router.post(
    "/journal/{entry_id}/prediction",
    response_model=PredictionRead,
    status_code=201,
    summary="Attach a ghost prediction to a journal entry",
)
async def add_prediction(
    entry_id: uuid.UUID,
    payload: PredictionCreate,
    db: DbSession,
) -> Prediction:
    """Persist a ghost-position prediction linked to a journal entry.

    Args:
        entry_id: UUID of the parent journal entry.
        payload: PredictionCreate body.
        db: Injected async database session.

    Returns:
        The newly created PredictionRead.

    Raises:
        HTTPException 404: If the parent journal entry does not exist.
    """
    entry = await db.get(JournalEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    prediction = Prediction(journal_entry_id=entry_id, **payload.model_dump())
    db.add(prediction)
    await db.flush()
    await db.refresh(prediction)
    logger.info(
        "Added prediction id=%s to journal entry id=%s", prediction.id, entry_id
    )
    return prediction


# ── Watchlist ─────────────────────────────────────────────────────────────────


@router.get(
    "/watchlist",
    response_model=list[WatchlistItemRead],
    summary="List watchlist items",
)
async def list_watchlist(db: DbSession) -> list[WatchlistItem]:
    """Return all watchlist items ordered by creation time (newest first).

    Args:
        db: Injected async database session.

    Returns:
        List of WatchlistItemRead objects.
    """
    result = await db.execute(
        select(WatchlistItem).order_by(WatchlistItem.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/watchlist",
    response_model=WatchlistItemRead,
    status_code=201,
    summary="Add a source to the watchlist",
)
async def add_to_watchlist(
    payload: WatchlistItemCreate, db: DbSession
) -> WatchlistItem:
    """Add a source to the user's watchlist.

    Args:
        payload: WatchlistItemCreate body.
        db: Injected async database session.

    Returns:
        The newly created WatchlistItemRead.
    """
    item = WatchlistItem(**payload.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.delete(
    "/watchlist/{item_id}",
    status_code=204,
    summary="Remove a source from the watchlist",
)
async def remove_from_watchlist(item_id: uuid.UUID, db: DbSession) -> None:
    """Remove a source from the watchlist.

    Args:
        item_id: UUID of the watchlist item to delete.
        db: Injected async database session.

    Raises:
        HTTPException 404: If the item does not exist.
    """
    item = await db.get(WatchlistItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    await db.delete(item)
