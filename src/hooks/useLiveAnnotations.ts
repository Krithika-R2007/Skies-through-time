import { useEffect, useMemo, useState } from 'react'
import type { CelestialObject, ObjectComparison, Observation } from '../data/models'
import type { UnWiseChange, UnWiseChangeSequence } from '../data/api/types'
import { getUnWiseChangeSequence, unWiseDiffUrl } from '../data/api/endpoints'
import { describeError } from '../data/api/client'

// Annotated change sequence built from measurements instead of illustrations. The backend
// compares each consecutive pair of NEOWISE images of the field and reports where a source
// moved, brightened or faded. Each pair becomes one annotated step drawn on the later image.

const cache = new Map<string, UnWiseChangeSequence>()
const BOX = 0.12
const clamp = (v: number, lo = 0.02, hi = 0.98) => Math.min(hi, Math.max(lo, v))
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

function describe(c: UnWiseChange, from: string, to: string): { what: string; why: string } {
  if (c.kind === 'moved') {
    const rate = c.rate_arcsec_yr ? ` (about ${c.rate_arcsec_yr.toFixed(1)}\u2033 per year)` : ''
    return {
      what: `A source appears to have moved about ${(c.shift_arcsec ?? 0).toFixed(1)}\u2033${rate} between ${from} and ${to}.`,
      why: 'The same movement shows up in the next pair of images too, which is how a nearby star or a moving body looks. Glare from very bright stars can imitate movement, so treat this as a possible detection.',
    }
  }
  const pct = c.change_pct
  return {
    what:
      pct === null || pct === undefined
        ? `A new source appears between ${from} and ${to}.`
        : `A source ${c.kind} by about ${Math.abs(pct)}% between ${from} and ${to}.`,
    why: 'Brightness changes can be real variability, or a difference in how deep the two images are. Following the source over more epochs helps tell them apart.',
  }
}

function shortText(c: UnWiseChange): string {
  if (c.kind === 'moved') {
    return `Moved about ${(c.shift_arcsec ?? 0).toFixed(1)}\u2033${c.rate_arcsec_yr ? ` (${c.rate_arcsec_yr.toFixed(1)}\u2033/yr)` : ''}`
  }
  if (c.change_pct === null || c.change_pct === undefined) return 'New source appeared'
  return `${c.kind === 'brightened' ? 'Brightened' : 'Faded'} by about ${Math.abs(c.change_pct)}%`
}

function toComparison(
  id: string,
  a: Observation,
  b: Observation,
  changes: UnWiseChange[],
  diffImageSrc: string,
): ObjectComparison {
  const markers = changes.map((c) => ({
    kind: c.kind, x: c.x, y: c.y, fromX: c.from_x, fromY: c.from_y, text: shortText(c),
  }))
  if (changes.length === 0) {
    return {
      id, firstObservationId: a.id, secondObservationId: b.id,
      highlightedRegions: [], annotations: [], changes: [], diffImageSrc,
      changeDescription: `No measurable change between ${a.observationEpoch} and ${b.observationEpoch}.`,
      scientificInterpretation: 'Nothing in this field changed by more than five times the image noise between these two NEOWISE images.',
      isDemoData: false,
    }
  }
  const c = changes[0]
  const { what, why } = describe(c, a.observationEpoch, b.observationEpoch)
  const others = changes.length - 1
  const region = { x: clamp(c.x - BOX / 2, 0, 1 - BOX), y: clamp(c.y - BOX / 2, 0, 1 - BOX), width: BOX, height: BOX }

  let arrow
  if (c.kind === 'moved' && c.from_x !== undefined && c.from_y !== undefined) {
    // Point along the measured direction of motion, ending at the box.
    const dx = c.x - c.from_x
    const dy = c.y - c.from_y
    const n = Math.hypot(dx, dy) || 1
    const ux = dx / n
    const uy = dy / n
    arrow = {
      from: { x: clamp(c.x - ux * 0.17), y: clamp(c.y - uy * 0.17) },
      to: { x: clamp(c.x - ux * 0.07), y: clamp(c.y - uy * 0.07) },
    }
  } else {
    arrow = { from: { x: clamp(c.x - 0.14), y: clamp(c.y - 0.14) }, to: { x: clamp(c.x - 0.06), y: clamp(c.y - 0.06) } }
  }

  return {
    id, firstObservationId: a.id, secondObservationId: b.id,
    changes: markers, diffImageSrc,
    highlightedRegions: [region],
    annotations: [{ regionIndex: 0, arrow, label: what }],
    changeDescription: others > 0 ? `${what} ${plural(others, 'other change')} measured in this field.` : what,
    scientificInterpretation: why,
    isDemoData: false,
  }
}

const versionOf = (o: Observation) => (o.live?.kind === 'unwise' ? o.live.obsid.replace(/^unWISE_/, '') : null)
const sizeOf = (o: Observation) => Number(/[?&]size=(\d+)/.exec(o.live?.cutoutUrl ?? '')?.[1] ?? 200)

export function useLiveAnnotations(obj: CelestialObject | undefined, observations: Observation[], enabled: boolean) {
  const neowise = useMemo(() => observations.filter((o) => versionOf(o)), [observations])
  const active = enabled && !!obj && neowise.length >= 2
  const key = obj ? `${obj.rightAscension.toFixed(4)}_${obj.declination.toFixed(4)}` : ''
  const [state, setState] = useState<{ key: string; data: UnWiseChangeSequence | null; error: string; done: boolean }>({
    key: '', data: null, error: '', done: false,
  })

  useEffect(() => {
    if (!active || !obj) return
    const hit = cache.get(key)
    if (hit) {
      setState({ key, data: hit, error: '', done: true })
      return
    }
    const ctrl = new AbortController()
    setState({ key, data: null, error: '', done: false })
    getUnWiseChangeSequence(obj.rightAscension, obj.declination, sizeOf(neowise[0]), { signal: ctrl.signal })
      .then((d) => {
        cache.set(key, d)
        setState({ key, data: d, error: '', done: true })
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setState({ key, data: null, error: describeError(e), done: true })
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key])

  return useMemo(() => {
    if (!active) return { comparisons: [] as ObjectComparison[], loading: false, error: '' }
    if (state.key !== key || !state.done) return { comparisons: [] as ObjectComparison[], loading: true, error: '' }
    if (!state.data) return { comparisons: [] as ObjectComparison[], loading: false, error: state.error }
    const byVersion = new Map(neowise.map((o) => [versionOf(o)!, o]))
    const comparisons = state.data.pairs.flatMap((p, i) => {
      const a = byVersion.get(p.version_a)
      const b = byVersion.get(p.version_b)
      if (!a || !b || !obj) return []
      const diff = unWiseDiffUrl(obj.rightAscension, obj.declination, p.version_a, p.version_b, sizeOf(a))
      return [toComparison(`live-cmp-${key}-${i}`, a, b, p.changes, diff)]
    })
    return { comparisons, loading: false, error: '' }
  }, [active, state, key, neowise, obj])
}
