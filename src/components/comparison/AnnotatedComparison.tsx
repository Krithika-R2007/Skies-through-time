import { motion } from 'framer-motion'
import { ObservationImage } from '../observation-panel/ObservationImage'
import type { ChangeMarker, Observation, ObjectComparison, SpectralBand } from '../../data/models'
import { displayedPlaceholder } from '../../utils/observation'
import { gridColumns } from './ComparisonViewer'

// Annotated change view: the before and after pictures side by side, with every change
// highlighted on both. For live data a third panel shows the difference image (after minus
// before), and each measured change is numbered and circled in all three panels:
//  - before: where the source was (dashed for a source that moved or brightened)
//  - after:  where it is now, with an arrow for the direction of motion
//  - difference: the change itself (blue = brighter later, red = fainter later)
// Demonstration records carry one illustrative region, drawn on both pictures.

type Side = 'before' | 'after' | 'diff'

export const MARKER_COLOR: Record<ChangeMarker['kind'], string> = {
  moved: '#ffb02e',
  brightened: '#5ad9e6',
  faded: '#ff7a7a',
}

const MARKER_SIZE = 10 // percent of the tile width

function Circle({ x, y, color, dashed, n, delay }: { x: number; y: number; color: string; dashed?: boolean; n?: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="pointer-events-none absolute aspect-square rounded-full"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${MARKER_SIZE}%`,
        translate: '-50% -50%',
        border: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
        boxShadow: dashed ? undefined : `0 0 10px ${color}66`,
      }}
    >
      {n !== undefined && (
        <span
          className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-heading text-[10px] font-semibold text-void"
          style={{ background: color }}
        >
          {n}
        </span>
      )}
    </motion.div>
  )
}

function Arrow({ from, to, color, id }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string; id: string }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <marker id={id} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill={color} />
        </marker>
      </defs>
      <motion.line
        x1={from.x * 100} y1={from.y * 100} x2={to.x * 100} y2={to.y * 100}
        stroke={color} strokeWidth="0.6" markerEnd={`url(#${id})`}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.3 }}
      />
    </svg>
  )
}

const clamp = (v: number) => Math.min(0.98, Math.max(0.02, v))

function LiveMarkers({ changes, side, cid }: { changes: ChangeMarker[]; side: Side; cid: string }) {
  return (
    <>
      {changes.map((m, i) => {
        const color = MARKER_COLOR[m.kind]
        const moved = m.kind === 'moved' && m.fromX !== undefined && m.fromY !== undefined
        const delay = 0.08 * i
        if (side === 'before') {
          // Where it was. Dashed when the "before" spot is empty or fainter.
          return (
            <Circle key={i} n={i + 1} color={color} delay={delay}
              x={moved ? m.fromX! : m.x} y={moved ? m.fromY! : m.y} dashed={m.kind !== 'faded'} />
          )
        }
        if (side === 'after') {
          if (!moved) return <Circle key={i} n={i + 1} color={color} x={m.x} y={m.y} dashed={m.kind === 'faded'} delay={delay} />
          const dx = m.x - m.fromX!
          const dy = m.y - m.fromY!
          const len = Math.hypot(dx, dy) || 1
          const ux = dx / len
          const uy = dy / len
          return (
            <span key={i}>
              <Circle color={color} x={m.fromX!} y={m.fromY!} dashed delay={delay} />
              <Circle n={i + 1} color={color} x={m.x} y={m.y} delay={delay} />
              <Arrow id={`ah-${cid}-${i}`} color={color}
                from={{ x: clamp(m.x - ux * 0.17), y: clamp(m.y - uy * 0.17) }}
                to={{ x: clamp(m.x - ux * 0.07), y: clamp(m.y - uy * 0.07) }} />
            </span>
          )
        }
        return (
          <span key={i}>
            {moved && <Circle color={color} x={m.fromX!} y={m.fromY!} dashed delay={delay} />}
            <Circle n={i + 1} color={color} x={m.x} y={m.y} delay={delay} />
          </span>
        )
      })}
    </>
  )
}

function DemoMarkers({ comparison, side }: { comparison: ObjectComparison; side: Side }) {
  const region = comparison.highlightedRegions[0]
  const annotation = comparison.annotations[0]
  if (!region) return null
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`pointer-events-none absolute rounded-md border-2 border-cyan/80 ${side === 'before' ? 'border-dashed' : ''}`}
        style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}
      />
      {side === 'after' && annotation && (
        <Arrow id={`ah-${comparison.id}`} color="#5ad9e6" from={annotation.arrow.from} to={annotation.arrow.to} />
      )}
    </>
  )
}

export function AnnotatedComparison({
  before,
  after,
  comparison,
  bands,
  selectedBandId,
}: {
  before: Observation
  after: Observation
  comparison: ObjectComparison
  bands: SpectralBand[]
  selectedBandId: string
}) {
  const live = !comparison.isDemoData
  const tiles: { side: Side; label: string; obs: Observation; src?: string; badge?: string }[] = [
    { side: 'before', label: `Before \u00b7 ${before.observationEpoch}`, obs: before, src: live ? before.live?.imageSrc : undefined, badge: live ? 'NASA NEOWISE' : undefined },
    { side: 'after', label: `After \u00b7 ${after.observationEpoch}`, obs: after, src: live ? after.live?.imageSrc : undefined, badge: live ? 'NASA NEOWISE' : undefined },
  ]
  if (live && comparison.diffImageSrc) {
    tiles.push({ side: 'diff', label: 'What changed', obs: after, src: comparison.diffImageSrc, badge: 'Difference' })
  }
  const changes = comparison.changes ?? []

  return (
    <div>
      <div className={`grid gap-x-3 gap-y-4 sm:gap-x-4 ${gridColumns(tiles.length)}`}>
        {tiles.map((t) => (
          <figure key={t.side}>
            <figcaption className="mb-1.5 font-heading text-sm tracking-wide text-cyan">{t.label}</figcaption>
            <ObservationImage
              placeholder={displayedPlaceholder(t.obs, selectedBandId, bands)}
              src={t.src}
              badge={t.badge}
              aspect={live ? 'aspect-square' : 'aspect-[4/3]'}
              instant
            >
              {live ? (
                <LiveMarkers key={comparison.id} changes={changes} side={t.side} cid={`${comparison.id}-${t.side}`} />
              ) : (
                <DemoMarkers key={comparison.id} comparison={comparison} side={t.side} />
              )}
            </ObservationImage>
          </figure>
        ))}
      </div>
      <p className="mt-3 font-body text-xs leading-relaxed text-lavender/60">
        {live ? (
          <>
            Numbered circles mark each measured change on every picture:{' '}
            <span style={{ color: MARKER_COLOR.moved }}>amber moved</span>,{' '}
            <span style={{ color: MARKER_COLOR.brightened }}>cyan brightened</span>,{' '}
            <span style={{ color: MARKER_COLOR.faded }}>red faded</span>. Dashed circles show where a source was, or a spot that was fainter.
            In the difference picture, <span className="text-sky-300">blue</span> got brighter and <span className="text-red-300">red</span> got fainter.
          </>
        ) : (
          'The box marks the same region in both pictures: dashed before, solid after.'
        )}
      </p>
    </div>
  )
}
