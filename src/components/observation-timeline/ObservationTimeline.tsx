import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Observation } from '../../data/models'
import { indexToPosition } from '../../utils/observation'

function position(index: number, count: number): number {
  return count <= 1 ? 0.5 : indexToPosition(index, count)
}

const ARROW =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-lavender/70 transition-colors hover:border-neon/50 hover:text-neon disabled:pointer-events-none disabled:opacity-30'

// Data-driven observation timeline. A glowing track fills up to the selected epoch,
// every observation is a node with its year beneath, and a ringed playhead glides
// between them. An invisible native range input sits on top, so dragging, clicking
// anywhere on the track and keyboard control all work. Handles 0, 1 and many records.
export function ObservationTimeline({
  observations,
  index,
  onChange,
}: {
  observations: Observation[]
  index: number
  onChange: (index: number) => void
}) {
  const count = observations.length

  if (count === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
        <p className="font-heading text-sm text-lavender/60">No observations available yet.</p>
      </div>
    )
  }

  const p = position(index, count)
  // With many epochs only every Nth label is shown (plus the selected one) so they never overlap.
  const step = Math.max(1, Math.ceil(count / 7))
  const showLabel = (i: number) => count <= 8 || i === index || (i % step === 0 && Math.abs(i - index) >= Math.ceil(step / 2))

  return (
    <div className="select-none rounded-2xl border border-white/10 bg-black/35 px-3 py-3 backdrop-blur-md sm:px-4">
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(index - 1)} disabled={index <= 0} aria-label="Previous observation" className={ARROW}>
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="relative h-14 flex-1">
          {/* Input is inset-0; visuals are inset by the thumb radius so nodes line up with it */}
          <input
            type="range"
            min={0}
            max={Math.max(0, count - 1)}
            step={1}
            value={index}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={count <= 1}
            aria-label="Observation timeline"
            className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          />

          <div className="pointer-events-none absolute inset-y-0 left-2 right-2">
            <div className="absolute inset-x-0 top-3 h-0.5 -translate-y-1/2 rounded-full bg-white/15" />
            <motion.div
              className="absolute left-0 top-3 h-0.5 -translate-y-1/2 rounded-full bg-neon shadow-[0_0_10px_rgba(255,176,46,0.6)]"
              initial={false}
              animate={{ width: `${p * 100}%` }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            />

            {observations.map((o, i) => (
              <div key={o.id}>
                <span
                  className={`absolute top-3 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300 ${
                    i <= index ? 'bg-neon/80' : 'bg-white/30'
                  }`}
                  style={{ left: `${position(i, count) * 100}%` }}
                />
                {showLabel(i) && <span
                  className={`absolute top-[1.65rem] -translate-x-1/2 font-heading text-xs transition-colors duration-300 ${
                    i === index ? 'font-semibold text-neon' : 'text-lavender/60'
                  }`}
                  style={{ left: `${position(i, count) * 100}%` }}
                >
                  {o.observationEpoch}
                </span>}
              </div>
            ))}

            <motion.div
              className="absolute top-3 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-neon bg-void shadow-[0_0_16px_rgba(255,176,46,0.55)]"
              initial={false}
              animate={{ left: `${p * 100}%` }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            </motion.div>
          </div>
        </div>

        <button onClick={() => onChange(index + 1)} disabled={index >= count - 1} aria-label="Next observation" className={ARROW}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// Re-export for tests that verify position math.
export { indexToPosition }
