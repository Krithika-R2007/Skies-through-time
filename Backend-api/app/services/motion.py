"""Proper-motion detection by cross-matching sources across epochs."""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import numpy as np

from app.services.detect import SourceDetection

logger = logging.getLogger(__name__)

_MATCH_RADIUS_PX = 5.0
_ARCSEC_PER_PX_APPROX = 6.2  # SPHEREx pixel scale ≈ 6.2"/px


@dataclass
class MatchedSource:
    source_id: str
    ra_initial: float
    dec_initial: float
    epoch_indices: list[int]
    timestamps: list[datetime]
    x_pix_list: list[float]
    y_pix_list: list[float]
    ra_list: list[float]
    dec_list: list[float]
    flux_list: list[float]
    snr_list: list[float]
    vx_arcsec_yr: float = 0.0
    vy_arcsec_yr: float = 0.0
    vx_err: float = 0.0
    vy_err: float = 0.0
    proper_motion_arcsec_yr: float = 0.0
    n_epochs: int = 0
    snr: float = 0.0


def _years_since(t0: datetime, t1: datetime) -> float:
    return (t1 - t0).total_seconds() / (365.25 * 86400)


def find_moving_sources(
    detections_by_epoch: list[list[SourceDetection]],
    timestamps: list[datetime],
    wcs: Any,
    min_proper_motion_arcsec_yr: float = 0.5,
) -> list[MatchedSource]:
    """Cross-match sources across epochs and fit proper-motion vectors.

    Args:
        detections_by_epoch: One list of SourceDetection per epoch.
        timestamps: One datetime per epoch (same order).
        wcs: Common WCS for the field.
        min_proper_motion_arcsec_yr: Minimum total PM to report.

    Returns:
        MatchedSource objects whose PM exceeds the threshold.
    """
    if len(detections_by_epoch) < 2:
        return []

    # Build tracks: seed from epoch 0
    tracks: list[dict] = []
    for det in detections_by_epoch[0]:
        tracks.append(
            {
                "detections": [det],
                "epoch_indices": [0],
            }
        )

    # Extend tracks epoch by epoch
    for ep_idx in range(1, len(detections_by_epoch)):
        new_epoch_dets = detections_by_epoch[ep_idx]
        matched_det_indices: set[int] = set()

        for track in tracks:
            last_det = track["detections"][-1]
            best_dist = _MATCH_RADIUS_PX + 1
            best_det_idx = -1

            for di, candidate in enumerate(new_epoch_dets):
                if di in matched_det_indices:
                    continue
                dist = math.sqrt(
                    (candidate.x_pix - last_det.x_pix) ** 2
                    + (candidate.y_pix - last_det.y_pix) ** 2
                )
                if dist < best_dist:
                    best_dist = dist
                    best_det_idx = di

            if best_det_idx >= 0:
                track["detections"].append(new_epoch_dets[best_det_idx])
                track["epoch_indices"].append(ep_idx)
                matched_det_indices.add(best_det_idx)

        # Add unmatched detections as new tracks
        for di, det in enumerate(new_epoch_dets):
            if di not in matched_det_indices:
                tracks.append({"detections": [det], "epoch_indices": [ep_idx]})

    # Fit PM for tracks seen in ≥ 2 epochs
    results: list[MatchedSource] = []
    t0 = timestamps[0]

    for track_idx, track in enumerate(tracks):
        dets = track["detections"]
        eps = track["epoch_indices"]
        if len(dets) < 2:
            continue

        t_years = np.array(
            [_years_since(t0, timestamps[ei]) for ei in eps], dtype=float
        )
        x_arcsec = np.array([d.x_pix * _ARCSEC_PER_PX_APPROX for d in dets])
        y_arcsec = np.array([d.y_pix * _ARCSEC_PER_PX_APPROX for d in dets])

        # Linear least-squares: position = offset + velocity * t
        A = np.column_stack([np.ones_like(t_years), t_years])
        try:
            (x0, vx), residuals_x, _, _ = np.linalg.lstsq(A, x_arcsec, rcond=None)
            (y0, vy), residuals_y, _, _ = np.linalg.lstsq(A, y_arcsec, rcond=None)
        except Exception:
            continue

        pm = math.sqrt(vx**2 + vy**2)
        if pm < min_proper_motion_arcsec_yr:
            continue

        # Rough velocity uncertainty from residuals
        n = len(dets)
        vx_err = float(np.std(x_arcsec - (x0 + vx * t_years))) / max(1, n - 1)
        vy_err = float(np.std(y_arcsec - (y0 + vy * t_years))) / max(1, n - 1)

        avg_snr = float(np.mean([d.snr for d in dets]))
        first_det = dets[0]

        results.append(
            MatchedSource(
                source_id=f"src_{track_idx:04d}",
                ra_initial=first_det.ra,
                dec_initial=first_det.dec,
                epoch_indices=eps,
                timestamps=[timestamps[ei] for ei in eps],
                x_pix_list=[d.x_pix for d in dets],
                y_pix_list=[d.y_pix for d in dets],
                ra_list=[d.ra for d in dets],
                dec_list=[d.dec for d in dets],
                flux_list=[d.flux for d in dets],
                snr_list=[d.snr for d in dets],
                vx_arcsec_yr=float(vx),
                vy_arcsec_yr=float(vy),
                vx_err=vx_err,
                vy_err=vy_err,
                proper_motion_arcsec_yr=pm,
                n_epochs=len(dets),
                snr=avg_snr,
            )
        )

    results.sort(key=lambda s: s.proper_motion_arcsec_yr, reverse=True)
    return results
