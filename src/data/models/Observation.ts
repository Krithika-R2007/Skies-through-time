import type { ImagePlaceholder } from './ImagePlaceholder'
import type { AnomalyFlag } from '../api/types'

/** Real SPHEREx data attached to an observation when it came from the backend. */
export interface LiveObservationData {
  obsid: string
  bandpassId: string | null
  /** Cutout URL exactly as returned by /sky/card (passed to other endpoints). */
  cutoutUrl: string
  /** Cutout URL at the render size (0.1 deg). Used for every image/spectrum request. */
  renderUrl: string
  /** Ready-to-use PNG URL served by the backend. */
  imageSrc: string
  anomalies: AnomalyFlag[]
  /** 'unwise' = NEOWISE fallback frame: no spectral channels, spectrum or diff tools. */
  kind?: 'spherex' | 'unwise'
}

export interface Observation {
  id: string
  objectId: string
  observationDate: string
  observationEpoch: string
  imagePlaceholder: ImagePlaceholder
  spectralBand: string
  description: string
  source: string
  isDemoData: boolean
  live?: LiveObservationData
}
