export interface HighlightedRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface ComparisonAnnotation {
  regionIndex: number
  arrow: { from: { x: number; y: number }; to: { x: number; y: number } }
  label: string
}

/** One measured change, positioned as fractions (0..1) of the before/after images. */
export interface ChangeMarker {
  kind: 'moved' | 'brightened' | 'faded'
  /** Position in the after image. */
  x: number
  y: number
  /** Position in the before image, when it differs (movers). */
  fromX?: number
  fromY?: number
  text: string
}

export interface ObjectComparison {
  /** Measured changes (live data). Demonstration records use highlightedRegions instead. */
  changes?: ChangeMarker[]
  /** Difference image (after minus before), when available. */
  diffImageSrc?: string
  id: string
  firstObservationId: string
  secondObservationId: string
  highlightedRegions: HighlightedRegion[]
  annotations: ComparisonAnnotation[]
  changeDescription: string
  scientificInterpretation: string
  isDemoData: boolean
}
