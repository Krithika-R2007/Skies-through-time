import { API_BASE, apiGet, apiRequest, buildUrl } from './client'
import type {
  CadcCounts,
  ChangeCandidate,
  ChannelInfo,
  CompareResult,
  GaiaClassification,
  GaiaSource,
  GhostPrediction,
  HealpixCoverage,
  JournalEntry,
  MotionResult,
  NeossatObs,
  Readiness,
  SearchResult,
  SkyCard,
  Spectrum,
  UnWiseBlink,
  UnWiseChangeSequence,
  UnWiseStatus,
  WatchlistItem,
} from './types'

type Sig = { signal?: AbortSignal }

// --- Health ---
export const getHealth = (o?: Sig) => apiGet<{ status: string }>('/health', undefined, { timeoutMs: 3000, ...o })
export const getReadiness = (o?: Sig) => apiGet<Readiness>('/health/ready', undefined, { timeoutMs: 4000, ...o })

// --- Search / sky card ---
export const searchSky = (q: string, o?: Sig) => apiGet<SearchResult>('/search', { q }, { timeoutMs: 15000, ...o })
export const getSkyCard = (ra: number, dec: number, size = 0.5, o?: Sig) =>
  apiGet<SkyCard>('/sky/card', { ra, dec, size }, { timeoutMs: 45000, ...o })

// --- Image URLs (used directly as <img src>) ---
/** IRSA cutouts requested at 0.5 deg for discovery are rendered at 0.1 deg (guide, section 3.1). */
export function renderUrl(cutoutUrl: string): string {
  return cutoutUrl.replace(/size=0\.5d/, 'size=0.1d')
}
/** NEOWISE fallback frames come back from /sky/card as backend-relative image paths. */
export const isUnWiseUrl = (u: string) => u.startsWith('/unwise/')
export const cutoutImageUrl = (cutoutUrl: string, ra: number, dec: number) =>
  isUnWiseUrl(cutoutUrl) ? `${API_BASE}${cutoutUrl}` : buildUrl('/sky/cutout', { url: cutoutUrl, ra, dec })
export const channelImageUrl = (cutoutUrl: string, channel: number) =>
  buildUrl('/explore/channel', { url: cutoutUrl, channel })
export const compareImageUrl = (relative: string) => (relative.startsWith('http') ? relative : `${API_BASE}${relative}`)

// --- Spectral ---
export const getChannelMetadata = (url: string, o?: Sig) =>
  apiGet<ChannelInfo[]>('/explore/channel/metadata', { url }, { timeoutMs: 45000, ...o })
export const getSpectrum = (ra: number, dec: number, url: string, o?: Sig) =>
  apiGet<Spectrum>('/spectrum', { ra, dec, url }, { timeoutMs: 60000, ...o })

// --- Change / motion ---
export const compareEpochs = (urlA: string, urlB: string, obsidA: string, obsidB: string, o?: Sig) =>
  apiGet<CompareResult>(
    '/explore/compare',
    { url_a: urlA, url_b: urlB, obsid_a: obsidA, obsid_b: obsidB },
    { timeoutMs: 90000, ...o },
  )
export const getChanges = (ra: number, dec: number, size = 0.05, o?: Sig) =>
  apiGet<ChangeCandidate[]>('/explore/changes', { ra, dec, size }, { timeoutMs: 120000, ...o })
export const detectMotion = (ra: number, dec: number, size = 0.1, o?: Sig) =>
  apiGet<MotionResult>('/motion/detect', { ra, dec, size }, { timeoutMs: 120000, ...o })
export const getGhost = (ra: number, dec: number, size: number, sourceId: string, o?: Sig) =>
  apiGet<GhostPrediction>('/motion/ghost', { ra, dec, size, source_id: sourceId }, { timeoutMs: 120000, ...o })

// --- Catalogues / context ---
export const getGaiaCone = (ra: number, dec: number, radius = 0.1, limit = 200, o?: Sig) =>
  apiGet<GaiaSource[]>('/gaia/cone', { ra, dec, radius, limit }, { timeoutMs: 30000, ...o })
export const getGaiaCrossmatch = (ra: number, dec: number, radiusArcsec = 5, o?: Sig) =>
  apiGet<GaiaSource | null>('/gaia/crossmatch', { ra, dec, radius_arcsec: radiusArcsec }, { timeoutMs: 30000, ...o })
export const getGaiaClassify = (ra: number, dec: number, radiusArcsec = 5, properMotion?: number, o?: Sig) =>
  apiGet<GaiaClassification>(
    '/gaia/classify',
    { ra, dec, match_radius_arcsec: radiusArcsec, ...(properMotion !== undefined ? { proper_motion_arcsec_yr: properMotion } : {}) },
    { timeoutMs: 30000, ...o },
  )
export const getNeossat = (ra: number, dec: number, radius = 0.5, o?: Sig) =>
  apiGet<NeossatObs[]>('/neossat/cone', { ra, dec, radius, limit: 50 }, { timeoutMs: 30000, ...o })
export const getCadcCounts = (ra: number, dec: number, radius = 0.5, o?: Sig) =>
  apiGet<CadcCounts>('/cadc/collections', { ra, dec, radius }, { timeoutMs: 30000, ...o })
export const getHealpix = (nside = 32, o?: Sig) =>
  apiGet<HealpixCoverage>(
    '/explore/healpix',
    { ra_min: 0, ra_max: 360, dec_min: -90, dec_max: 90, nside },
    { timeoutMs: 30000, ...o },
  )

// --- unWISE / NEOWISE blink ---
export const getUnWiseBlink = (ra: number, dec: number, band: 1 | 2 = 1, size = 100, o?: Sig) =>
  apiGet<UnWiseBlink>('/unwise/blink', { ra, dec, band, size }, { timeoutMs: 30000, ...o })
export const getUnWiseStatus = (ra: number, dec: number, o?: Sig) =>
  apiGet<{ epochs: UnWiseStatus }>('/unwise/status', { ra, dec }, { timeoutMs: 10000, ...o })
/** Measured changes between every consecutive pair of NEOWISE epochs (Annotated tab). */
export const getUnWiseChangeSequence = (ra: number, dec: number, size = 200, o?: Sig) =>
  apiGet<UnWiseChangeSequence>('/unwise/changes/sequence', { ra, dec, size, band: 1 }, { timeoutMs: 120000, ...o })
/** Colour difference image (later minus earlier) between two NEOWISE epochs. */
export const unWiseDiffUrl = (ra: number, dec: number, versionA: string, versionB: string, size = 200) =>
  buildUrl('/unwise/diff/frame', { ra, dec, version_a: versionA, version_b: versionB, band: 1, size })
/** Returns a ready-to-use PNG src for a single unWISE frame. */
export const unWiseFrameUrl = (ra: number, dec: number, version: string, band: 1 | 2 = 1, size = 100) =>
  buildUrl('/unwise/blink/frame', { ra, dec, version, band, size })

// --- Journal / watchlist ---
export const listJournal = () => apiGet<JournalEntry[]>('/journal', undefined, { timeoutMs: 6000 })
export const createJournal = (body: { ra: number; dec: number; size_deg: number; label?: string; notes?: string }) =>
  apiRequest<JournalEntry>('/journal', undefined, { method: 'POST', body, timeoutMs: 8000 })
export const deleteJournal = (id: string) =>
  apiRequest<void>(`/journal/${id}`, undefined, { method: 'DELETE', timeoutMs: 8000 })
export const listWatchlist = () => apiGet<WatchlistItem[]>('/watchlist', undefined, { timeoutMs: 6000 })
export const addWatch = (body: { ra: number; dec: number; label?: string; last_flux?: number; last_epoch?: string }) =>
  apiRequest<WatchlistItem>('/watchlist', undefined, { method: 'POST', body, timeoutMs: 8000 })
export const removeWatch = (id: string) =>
  apiRequest<void>(`/watchlist/${id}`, undefined, { method: 'DELETE', timeoutMs: 8000 })
