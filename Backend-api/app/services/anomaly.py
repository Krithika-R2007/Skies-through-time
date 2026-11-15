"""Anomaly service — thin wrapper so routers can import from app.services.anomaly."""

from __future__ import annotations

from app.dependencies import _anomaly_lookup, load_anomaly_lookup  # re-export

__all__ = ["load_anomaly_lookup", "_anomaly_lookup"]
