export type LabelBucket = 'none' | 'sparse' | 'full'

export function labelBucket(distance: number): LabelBucket {
  if (distance >= 700) return 'none'
  if (distance >= 300) return 'sparse'
  return 'full'
}

export function shouldShowLabels(distance: number): boolean {
  return labelBucket(distance) !== 'none'
}

export const MAX_LABELS = 24
