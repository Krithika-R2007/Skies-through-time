// Response shapes of the SPHEREx Timekeeper backend (see Backend-api/FRONTEND_INTEGRATION_GUIDE.md).

export interface AnomalyFlag {
  obsid: string
  anomaly_type: string
  anomaly_name: string
  band_1_affected: number
  band_2_affected: number
  band_3_affected: number
  band_4_affected: number
  band_5_affected: number
  band_6_affected: number
}

export interface CutoutInfo {
  obsid: string
  bandpass_id: string | null
  epoch_timestamp: string | null
  cutout_url: string
  anomaly_flags: AnomalyFlag[]
}

export interface SkyCard {
  ra: number
  dec: number
  size_deg: number
  n_epochs: number
  epoch_range: [string, string] | null
  cutouts: CutoutInfo[]
  narrative: string
}

export interface SearchResult {
  query: string
  ra: number
  dec: number
  name: string | null
  object_type: string | null
  source: 'simbad' | 'gaia' | 'coordinates' | string
  gaia_source_id: string | null
}

export interface ChannelInfo {
  channel: number
  wavelength_um: number
}

export interface SpectralPoint {
  wavelength_um: number
  flux_mjy_sr: number
  flux_error_mjy_sr: number | null
}
export interface Spectrum {
  ra: number
  dec: number
  obsid: string | null
  bandpass_id: string | null
  n_planes: number
  points: SpectralPoint[]
  quick_look: boolean
  note: string
}

export interface ChangeCandidate {
  ra: number
  dec: number
  x_pix: number
  y_pix: number
  snr: number
  dipole_score: number
  is_moving_candidate: boolean
}
export interface CompareResult {
  obsid_a: string
  obsid_b: string
  n_changes: number
  change_candidates: ChangeCandidate[]
  png_a_url: string
  png_b_url: string
  png_diff_url: string
}

export interface EpochPosition {
  epoch: string
  x_pix: number
  y_pix: number
  ra: number
  dec: number
  flux: number
  snr: number
}
export interface MovingSource {
  source_id: string
  ra_initial: number
  dec_initial: number
  proper_motion_arcsec_yr: number
  vx_arcsec_yr: number
  vy_arcsec_yr: number
  vx_err: number
  vy_err: number
  n_epochs: number
  snr: number
  positions: EpochPosition[]
}
export interface MotionResult {
  ra: number
  dec: number
  size_deg: number
  n_sources_detected: number
  n_moving: number
  moving_sources: MovingSource[]
}
export interface GhostPrediction {
  source_id: string
  current_ra: number
  current_dec: number
  current_epoch: string
  predicted_ra: number
  predicted_dec: number
  predicted_epoch: string
  vx_arcsec_yr: number
  vy_arcsec_yr: number
  proper_motion_arcsec_yr: number
  confidence: number
  confidence_label: 'high' | 'medium' | 'low' | string
  n_epochs_used: number
  fit_residual_arcsec: number
}

export interface GaiaSource {
  source_id: string
  ra: number
  dec: number
  pmra: number | null
  pmdec: number | null
  phot_g_mean_mag: number | null
  parallax: number | null
  distance_pc: number | null
  proper_motion_mas_yr: number | null
}

export interface NeossatObs {
  obs_id: string
  ra: number
  dec: number
  start_time: string | null
  exposure_time_s: number | null
  target_name: string | null
  instrument: string | null
  access_url: string | null
  fits_download_url: string | null
}

export type CadcCounts = Record<string, number>

export interface HealpixCoverage {
  nside: number
  n_pixels: number
  pixels: number[]
  ra_centres: number[]
  dec_centres: number[]
}

export interface Readiness {
  status: string
  database?: string
  redis?: string
}

export interface JournalEntry {
  id: string
  ra: number
  dec: number
  size_deg: number
  label: string | null
  notes: string | null
  created_at: string
  updated_at: string
  predictions: unknown[]
}
export interface WatchlistItem {
  id: string
  ra: number
  dec: number
  label: string | null
  last_flux: number | null
  last_epoch: string | null
}

// --- unWISE / NEOWISE ---

export interface UnWiseFrame {
  version: string
  date_label: string
  mjd_mid: number
  wavelength_um: number
  shape: [number, number]
  frame_url: string
}

export interface UnWiseBlink {
  ra: number
  dec: number
  band: number
  n_epochs: number
  wavelength_um: number
  source: string
  note: string
  frames: UnWiseFrame[]
}

export type UnWiseStatus = Record<string, 'ok' | 'error' | string>

/** A measured change between two NEOWISE epochs. x/y are fractions of the frame image. */
export interface UnWiseChange {
  kind: 'moved' | 'brightened' | 'faded'
  x: number
  y: number
  from_x?: number
  from_y?: number
  snr: number
  shift_arcsec?: number
  rate_arcsec_yr?: number | null
  change_pct?: number | null
}
export interface UnWiseChangePair {
  version_a: string
  version_b: string
  years_between: number
  n_changes: number
  changes: UnWiseChange[]
}
export interface UnWiseChangeSequence {
  ra: number
  dec: number
  band: number
  threshold_sigma: number
  pairs: UnWiseChangePair[]
}

// --- Gaia candidate classification ---

export type GaiaCandidateType =
  | 'known_star'
  | 'known_fast_mover'
  | 'candidate_solar_system'
  | 'candidate_brown_dwarf'
  | string

export interface GaiaClassification {
  ra: number
  dec: number
  is_known: boolean
  candidate_type: GaiaCandidateType
  confidence: number
  narrative: string
  separation_arcsec: number | null
  gaia_source_id: string | null
  gaia_proper_motion_mas_yr: number | null
  gaia_distance_pc: number | null
}
