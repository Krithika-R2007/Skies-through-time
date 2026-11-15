import { describe, it, expect } from 'vitest'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'

const provider = new MockAstronomyProvider()

describe('observation playback data', () => {
  it('produces consecutive comparisons for playback objects', () => {
    const comps = provider.getComparisons('betelgeuse')
    expect(comps.length).toBe(5)
    for (let i = 1; i < comps.length; i++) {
      expect(comps[i].firstObservationId).toBe(comps[i - 1].secondObservationId)
    }
  })

  it('comparisons reference real observation ids', () => {
    const obj = provider.getObjectById('andromeda')!
    const obs = provider.getObservations(obj.id)
    const comps = provider.getComparisons(obj.id)
    const obsIds = new Set(obs.map((o) => o.id))
    for (const c of comps) {
      expect(obsIds.has(c.firstObservationId)).toBe(true)
      expect(obsIds.has(c.secondObservationId)).toBe(true)
    }
  })

  it('annotations reference valid regions', () => {
    const comps = provider.getComparisons('andromeda')
    for (const c of comps) {
      expect(c.highlightedRegions.length).toBeGreaterThan(0)
      expect(c.annotations.length).toBeGreaterThan(0)
      const r = c.highlightedRegions[0]
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.x).toBeLessThanOrEqual(1)
    }
  })
})
