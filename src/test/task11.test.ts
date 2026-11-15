import { describe, it, expect } from 'vitest'
import { daysBetween, frameNotes, setNotes } from '../utils/frameNotes'
import { compareFit, gridColumnCount } from '../components/comparison/ComparisonViewer'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'
import type { Observation } from '../data/models'

const provider = new MockAstronomyProvider()

function liveObs(id: string, date: string, band: string | null, flags: string[] = []): Observation {
  return {
    id,
    objectId: 'x',
    observationDate: date,
    observationEpoch: date,
    imagePlaceholder: { seed: id, style: 'field', hue: 200 },
    spectralBand: band ?? 'SPHEREx',
    description: '',
    source: 'NASA SPHEREx via IRSA',
    isDemoData: false,
    live: {
      obsid: id,
      bandpassId: band,
      cutoutUrl: '',
      renderUrl: '',
      imageSrc: '',
      anomalies: flags.map((f) => ({ anomaly_name: f, anomaly_type: 'WARNING' })) as never,
    },
  }
}

describe('daysBetween', () => {
  it('counts whole days in either direction', () => {
    expect(daysBetween('2025-01-01', '2025-01-11')).toBe(10)
    expect(daysBetween('2025-01-11', '2025-01-01')).toBe(10)
  })
  it('returns 0 for invalid dates', () => {
    expect(daysBetween('nope', '2025-01-01')).toBe(0)
  })
})

describe('frameNotes (live data)', () => {
  it('reports quality flags as warnings', () => {
    const notes = frameNotes(liveObs('a', '2025-01-01', 'B1', ['Cosmic ray']))
    expect(notes.some((n) => n.tone === 'warn' && n.text.includes('Cosmic ray'))).toBe(true)
  })
  it('says so when there are no quality flags', () => {
    const notes = frameNotes(liveObs('a', '2025-01-01', 'B1'))
    expect(notes.some((n) => n.tone === 'good')).toBe(true)
  })
  it('warns that a band change can explain a brightness change', () => {
    const notes = frameNotes(liveObs('b', '2025-01-11', 'B2'), liveObs('a', '2025-01-01', 'B1'))
    expect(notes.some((n) => n.text.includes('Changed from B1 to B2'))).toBe(true)
    expect(notes.some((n) => n.text.includes('filter'))).toBe(true)
    expect(notes.some((n) => n.text.includes('10 days after'))).toBe(true)
  })
  it('notes a same-band pair', () => {
    const notes = frameNotes(liveObs('b', '2025-01-11', 'B1'), liveObs('a', '2025-01-01', 'B1'))
    expect(notes.some((n) => n.text.startsWith('Same band'))).toBe(true)
  })
})

describe('frameNotes (demonstration data)', () => {
  it('uses the illustrative comparison and labels it as such', () => {
    const obs = provider.getObservations('betelgeuse')
    const cmp = provider.getComparisons('betelgeuse')[0]
    const second = obs.find((o) => o.id === cmp.secondObservationId)!
    const notes = frameNotes(second, obs[0], cmp)
    expect(notes.some((n) => n.text === cmp.changeDescription)).toBe(true)
  })
  it('has no notes for a first demo frame with no comparison', () => {
    const obs = provider.getObservations('betelgeuse')
    expect(frameNotes(obs[0])).toEqual([])
  })
})

describe('setNotes', () => {
  it('needs at least two frames', () => {
    expect(setNotes([liveObs('a', '2025-01-01', 'B1')])).toEqual([])
  })
  it('flags mixed bands and flagged frames', () => {
    const notes = setNotes([liveObs('a', '2025-01-01', 'B1', ['x']), liveObs('b', '2025-02-01', 'B2')])
    expect(notes.some((n) => n.text.includes('2 different bands'))).toBe(true)
    expect(notes.some((n) => n.tone === 'warn')).toBe(true)
  })
  it('adds no mixed-band notes for non-live sets', () => {
    const obs = provider.getObservations('betelgeuse').slice(0, 3)
    expect(setNotes(obs).some((n) => n.tone === 'demo')).toBe(false)
  })
})
describe('compare sizing', () => {
  it('uses 3 columns for six frames', () => {
    expect(gridColumnCount(6)).toBe(3)
  })
  it('returns a height-based width cap', () => {
    expect(String(compareFit(6, false).maxWidth)).toContain('100vh')
  })
})
