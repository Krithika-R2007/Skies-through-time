import type { ObjectComparison, Observation } from '../data/models'

// Short, factual notes shown beside the image on the play page. They answer: why might
// this frame look different (a different filter band, a time gap), did something go wrong
// when the image was taken (quality flags from the archive), and, for demonstration data,
// what the illustrative change is. Everything is derived from the observation records
// themselves, so it works the same for mock data and for live SPHEREx data.

export type NoteTone = 'info' | 'warn' | 'good' | 'demo'

export interface FrameNote {
  id: string
  tone: NoteTone
  /** Small heading above the text, such as "Image quality". */
  label: string
  text: string
  /** Larger text, for the headline note of a view. */
  strong?: boolean
}

const DAY_MS = 86_400_000

export function daysBetween(a: string, b: string): number {
  const x = Date.parse(a)
  const y = Date.parse(b)
  if (Number.isNaN(x) || Number.isNaN(y)) return 0
  return Math.round(Math.abs(y - x) / DAY_MS)
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Notes for one frame, compared with the frame before it (if any). */
export function frameNotes(cur: Observation, prev?: Observation, demoChange?: ObjectComparison): FrameNote[] {
  const notes: FrameNote[] = []

  if (demoChange && !cur.live) {
    notes.push({ id: 'c', tone: 'demo', label: 'What changed', strong: true, text: demoChange.changeDescription })
    notes.push({ id: 'w', tone: 'demo', label: 'Why', text: demoChange.scientificInterpretation })
  }

  if (cur.live) {
    const flags = cur.live.anomalies
    if (flags.length > 0) {
      flags.forEach((f, i) =>
        notes.push({ id: `q${i}`, tone: 'warn', label: 'Image quality', text: `Image issue: ${f.anomaly_name}` }),
      )
    } else {
      notes.push({ id: 'q', tone: 'good', label: 'Image quality', text: 'No quality flags for this frame.' })
    }
    const a = prev?.live?.bandpassId
    const b = cur.live.bandpassId
    if (a && b) {
      if (a !== b) {
        notes.push({ id: 'b', tone: 'info', label: 'Filter band', text: `Changed from ${a} to ${b}.` })
        notes.push({
          id: 'bh',
          tone: 'info',
          label: 'How to read it',
          text: 'Brightness can differ because of the filter, not because the object changed.',
        })
      } else {
        notes.push({ id: 'b', tone: 'info', label: 'Filter band', text: `Same band (${b}), so differences are more telling.` })
      }
    }
  }

  if (prev) {
    const d = daysBetween(prev.observationDate, cur.observationDate)
    if (d > 0) notes.push({ id: 'd', tone: 'info', label: 'Timing', text: `${plural(d, 'day')} after the previous frame.` })
  }

  return notes
}

/** The "what changed / why it matters" notes for one annotated comparison. */
export function comparisonNotes(c: ObjectComparison): FrameNote[] {
  const changes = c.changes ?? []
  return [
    { id: 'c', tone: c.isDemoData ? 'demo' : 'info', label: 'What changed', strong: true, text: c.changeDescription },
    // One line per numbered marker on the pictures.
    ...changes.map((m, i) => ({ id: `m${i}`, tone: 'info' as const, label: `Change ${i + 1}`, text: m.text })),
    { id: 'w', tone: 'info', label: 'Why it matters', text: c.scientificInterpretation },
  ]
}

/** Notes about a whole set of frames shown together (Compare mode). */
export function setNotes(obs: Observation[]): FrameNote[] {
  if (obs.length < 2) return []
  const notes: FrameNote[] = []
  const d = daysBetween(obs[0].observationDate, obs[obs.length - 1].observationDate)
  if (d > 0) notes.push({ id: 'span', tone: 'info', label: 'Time span', text: `${plural(d, 'day')} between the first and last frame.` })

  if (obs.every((o) => o.live)) {
    const bands = new Set(obs.map((o) => o.live!.bandpassId ?? 'unknown'))
    notes.push(
      bands.size === 1
        ? { id: 'bands', tone: 'good', label: 'Filter bands', text: `All frames use the same band (${[...bands][0]}).` }
        : {
            id: 'bands',
            tone: 'info',
            label: 'Filter bands',
            text: `${bands.size} different bands: brightness can differ without a real change.`,
          },
    )
    const flagged = obs.filter((o) => o.live!.anomalies.length > 0).length
    if (flagged > 0) {
      notes.push({ id: 'flags', tone: 'warn', label: 'Image quality', text: `${plural(flagged, 'frame')} with quality flags.` })
    }
  }
  return notes
}
