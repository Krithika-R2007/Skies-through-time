import { useEffect, useMemo, useState } from 'react'
import type { CelestialObject, Observation, ObjectType } from '../data/models'
import { useDataProvider } from '../data/providers/DataContext'
import { cutoutImageUrl, getSkyCard, isUnWiseUrl, renderUrl } from '../data/api/endpoints'
import { describeError } from '../data/api/client'
import type { SkyCard } from '../data/api/types'
import { useBackendStore } from '../store/backendStore'

// Every object gets a real field lookup at its catalogue position. Solar-system bodies sit
// at illustrative places along the ecliptic (anchors.ts places them there, even those
// listed at RA 0, Dec 0 in the raw list), so their field shows real sky at that spot, not
// the body itself. Only the Sun has no sky position to look up.
const ZERO_POSITION = new Set(['sun'])
export const hasFixedPosition = (_t: ObjectType, id?: string) => !(id && ZERO_POSITION.has(id))

export type DataMode = 'live' | 'loading' | 'demo'

export interface ObjectObservations {
  observations: Observation[]
  mode: DataMode
  card: SkyCard | null
  /** Why demonstration data is shown (empty when live). */
  reason: string
}

const cardCache = new Map<string, SkyCard>()
const key = (o: CelestialObject) => `${o.rightAscension.toFixed(4)}_${o.declination.toFixed(4)}`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function cardToObservations(obj: CelestialObject, card: SkyCard): Observation[] {
  const sorted = [...card.cutouts].sort((a, b) =>
    (a.epoch_timestamp ?? '').localeCompare(b.epoch_timestamp ?? ''),
  )
  // When NEOWISE frames are mixed in, the series spans years, so label every frame by year.
  const mixed = card.cutouts.some((c) => isUnWiseUrl(c.cutout_url))
  return sorted.slice(0, 60).map((c, i) => {
    const d = c.epoch_timestamp ? new Date(c.epoch_timestamp) : null
    const valid = d && !Number.isNaN(d.getTime())
    const iso = valid ? d!.toISOString().slice(0, 10) : '2025-01-01'
    const label = !valid
      ? `#${i + 1}`
      : mixed
        ? String(d!.getUTCFullYear())
        : `${d!.getUTCDate()} ${MONTHS[d!.getUTCMonth()]}`
    const render = renderUrl(c.cutout_url)
    return {
      id: `live-${obj.id}-${c.obsid}`,
      objectId: obj.id,
      observationDate: iso,
      observationEpoch: label,
      imagePlaceholder: { seed: `live-${c.obsid}`, style: 'field', hue: 200 },
      spectralBand: c.bandpass_id ?? 'SPHEREx',
      description: `SPHEREx observation ${c.obsid}${c.bandpass_id ? ` (${c.bandpass_id})` : ''}.`,
      source: isUnWiseUrl(c.cutout_url) ? 'NASA NEOWISE via unWISE' : 'NASA SPHEREx via IRSA',
      isDemoData: false,
      live: {
        obsid: c.obsid,
        bandpassId: c.bandpass_id,
        cutoutUrl: c.cutout_url,
        renderUrl: render,
        imageSrc: cutoutImageUrl(render, obj.rightAscension, obj.declination),
        anomalies: c.anomaly_flags ?? [],
        kind: isUnWiseUrl(c.cutout_url) ? 'unwise' : 'spherex',
      },
    }
  })
}

/**
 * Real SPHEREx observations for an object, with the demonstration set as a fallback
 * whenever the backend is offline, the object moves, the field is unobserved or a
 * request fails. Pages render whatever comes back; the `mode` says which it is.
 */
export function useObjectObservations(obj: CelestialObject | undefined): ObjectObservations {
  const provider = useDataProvider()
  const backend = useBackendStore((s) => s.status)
  const demo = useMemo(() => (obj ? provider.getObservations(obj.id) : []), [provider, obj])
  const [state, setState] = useState<{ k: string; card: SkyCard | null; error: string; done: boolean }>({
    k: '', card: null, error: '', done: false,
  })

  const k = obj ? key(obj) : ''
  const eligible = !!obj && hasFixedPosition(obj.objectType, obj.id) && backend !== 'offline'

  useEffect(() => {
    if (!obj || !eligible) return
    const cached = cardCache.get(k)
    if (cached) {
      setState({ k, card: cached, error: '', done: true })
      return
    }
    const ctrl = new AbortController()
    setState({ k, card: null, error: '', done: false })
    getSkyCard(obj.rightAscension, obj.declination, 0.5, { signal: ctrl.signal })
      .then((card) => {
        cardCache.set(k, card)
        setState({ k, card, error: '', done: true })
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return
        setState({ k, card: null, error: describeError(e), done: true })
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, eligible])

  return useMemo<ObjectObservations>(() => {
    if (!obj) return { observations: [], mode: 'demo', card: null, reason: '' }
    if (!hasFixedPosition(obj.objectType, obj.id)) {
      // Objects with no real sky position (RA=0, Dec=0 placeholders)
      return {
        observations: demo, mode: 'demo', card: null,
        reason: 'No sky position is recorded for this object. The imagery here is illustrative.',
      }
    }
    if (backend === 'offline') {
      return { observations: demo, mode: 'demo', card: null, reason: 'The live SPHEREx archive is unreachable right now, so the imagery here is illustrative. Live data returns automatically.' }
    }
    if (state.k !== k || !state.done) {
      return { observations: demo, mode: 'loading', card: null, reason: '' }
    }
    if (state.card && state.card.cutouts.length > 0) {
      const liveObs = cardToObservations(obj, state.card)
      return { observations: liveObs, mode: 'live', card: state.card, reason: '' }
    }
    return {
      observations: demo, mode: 'demo', card: state.card,
      reason: state.error || 'SPHEREx has no recorded visits to this position yet. The imagery here is illustrative.',
    }
  }, [obj, demo, backend, state, k])
}
