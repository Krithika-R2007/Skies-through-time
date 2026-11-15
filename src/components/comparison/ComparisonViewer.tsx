import type { CSSProperties } from 'react'
import { ObservationImage } from '../observation-panel/ObservationImage'
import type { Observation, SpectralBand } from '../../data/models'
import { displayedPlaceholder, formatObservationDate } from '../../utils/observation'

// Columns used by the grid on wide screens, by how many observations are shown.
export function gridColumnCount(count: number): number {
  if (count <= 2) return 2
  if (count === 3) return 3
  if (count === 4) return 2
  if (count <= 6) return 3
  return 4
}

// Grid column layout by how many observations are shown, so 2 sit side by side and 6
// form a tidy 3 x 2 grid. Every tile keeps identical dimensions for fair comparison.
export function gridColumns(count: number): string {
  if (count <= 2) return 'grid-cols-1 sm:grid-cols-2'
  if (count === 3) return 'grid-cols-1 sm:grid-cols-3'
  if (count === 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-2 lg:grid-cols-4'
}

// Width cap so that the whole grid (rows of tiles plus their captions) fits the screen
// height without scrolling. `reserve` is the height taken by everything else on the page.
export function compareFit(count: number, live: boolean, reserve = '25rem'): CSSProperties {
  const cols = gridColumnCount(count)
  const rows = Math.ceil(count / cols)
  const tile = live ? 1 : 4 / 3
  const factor = (cols / rows) * tile
  return { maxWidth: `min(100%, max(22rem, calc((100vh - ${reserve}) * ${factor.toFixed(3)})))` }
}

// Each tile is a clean image with a plain caption underneath (date, band, and an amber
// line if the archive flagged a problem with that frame). Nothing sits on the picture.
export function ComparisonViewer({
  observations,
  bands,
  selectedBandId,
}: {
  observations: Observation[]
  bands: SpectralBand[]
  selectedBandId: string
}) {
  const live = observations.some((o) => o.live)
  return (
    <div className={`grid gap-x-3 gap-y-4 sm:gap-x-4 ${gridColumns(observations.length)}`}>
      {observations.map((o, i) => {
        const flags = o.live?.anomalies ?? []
        return (
          <figure key={o.id}>
            <ObservationImage
              placeholder={displayedPlaceholder(o, selectedBandId, bands)}
              src={o.live?.imageSrc}
              aspect={live ? 'aspect-square' : 'aspect-[4/3]'}
              instant
            />
            <figcaption className="mt-2 px-0.5">
              <p className="flex items-baseline justify-between gap-3 font-heading text-sm text-soft-white sm:text-base">
                <span>
                  {observations.length === 2 && (
                    <span className="mr-2 text-xs uppercase tracking-[0.18em] text-cyan/80">{i === 0 ? 'Before' : 'After'}</span>
                  )}
                  {formatObservationDate(o.observationDate)}
                </span>
                {o.live?.bandpassId && <span className="text-sm text-lavender/60">{o.live.bandpassId}</span>}
              </p>
              {flags.map((f, k) => (
                <p key={k} className="mt-0.5 border-l-2 border-amber-300/80 pl-2 font-body text-sm text-amber-200">
                  Image issue: {f.anomaly_name}
                </p>
              ))}
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
