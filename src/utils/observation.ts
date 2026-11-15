import type { ImagePlaceholder, Observation, SpectralBand } from '../data/models'

export function displayedPlaceholder(
  obs: Observation,
  bandId: string,
  bands: SpectralBand[],
): ImagePlaceholder {
  const bandIndex = Math.max(0, bands.findIndex((b) => b.id === bandId))
  const hue = (obs.imagePlaceholder.hue + bandIndex * 35) % 360
  return { seed: `${obs.id}-${bandId}`, style: obs.imagePlaceholder.style, hue }
}

export function formatObservationDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function nearestIndex(position: number, count: number): number {
  if (count <= 1) return 0
  return Math.min(count - 1, Math.max(0, Math.round(position * (count - 1))))
}

export function indexToPosition(index: number, count: number): number {
  if (count <= 1) return 0
  return index / (count - 1)
}
