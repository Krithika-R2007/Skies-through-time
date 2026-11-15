"""Ghost position prediction service."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.services.motion import MatchedSource


@dataclass
class GhostResult:
    source_id: str
    current_ra: float
    current_dec: float
    current_epoch: datetime
    predicted_ra: float
    predicted_dec: float
    predicted_epoch: datetime
    vx_arcsec_yr: float
    vy_arcsec_yr: float
    proper_motion_arcsec_yr: float
    confidence: float
    confidence_label: str
    n_epochs_used: int
    fit_residual_arcsec: float


def predict_ghost(ms: MatchedSource) -> GhostResult:
    """Extrapolate a moving source's position 6 months forward.

    Confidence:
    - high   if n_epochs >= 4 and snr > 10
    - medium if n_epochs >= 2
    - low    otherwise

    Args:
        ms: MatchedSource from find_moving_sources.

    Returns:
        GhostResult with predicted position.
    """
    # Last known position
    current_ra = ms.ra_list[-1] if ms.ra_list else ms.ra_initial
    current_dec = ms.dec_list[-1] if ms.dec_list else ms.dec_initial
    current_epoch = ms.timestamps[-1] if ms.timestamps else datetime.utcnow()

    # Propagate 6 months (0.5 yr) forward
    delta_yr = 0.5
    predicted_epoch = current_epoch + timedelta(days=182)

    # Convert arcsec/yr velocity to degrees/yr for RA/Dec
    cos_dec = math.cos(math.radians(current_dec)) or 1e-10
    delta_ra_deg = (ms.vx_arcsec_yr * delta_yr) / (3600.0 * cos_dec)
    delta_dec_deg = (ms.vy_arcsec_yr * delta_yr) / 3600.0

    predicted_ra = (current_ra + delta_ra_deg) % 360.0
    predicted_dec = max(-90.0, min(90.0, current_dec + delta_dec_deg))

    # Confidence
    if ms.n_epochs >= 4 and ms.snr > 10:
        confidence = 0.90
        confidence_label = "high"
    elif ms.n_epochs >= 2:
        confidence = 0.65
        confidence_label = "medium"
    else:
        confidence = 0.35
        confidence_label = "low"

    # Rough fit residual
    fit_residual = math.sqrt(ms.vx_err**2 + ms.vy_err**2) * delta_yr * 3600.0

    return GhostResult(
        source_id=ms.source_id,
        current_ra=current_ra,
        current_dec=current_dec,
        current_epoch=current_epoch,
        predicted_ra=predicted_ra,
        predicted_dec=predicted_dec,
        predicted_epoch=predicted_epoch,
        vx_arcsec_yr=ms.vx_arcsec_yr,
        vy_arcsec_yr=ms.vy_arcsec_yr,
        proper_motion_arcsec_yr=ms.proper_motion_arcsec_yr,
        confidence=confidence,
        confidence_label=confidence_label,
        n_epochs_used=ms.n_epochs,
        fit_residual_arcsec=float(fit_residual),
    )
