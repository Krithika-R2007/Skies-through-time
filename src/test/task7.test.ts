import { describe, it, expect } from 'vitest'
import { displayedPlaceholder, nearestIndex, indexToPosition } from '../utils/observation'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'

const provider = new MockAstronomyProvider()
const bands = provider.getSpectralBands('andromeda')

describe('observation utilities', () => {
  it('displayedPlaceholder shifts hue per band', () => {
    const obs = provider.getObservations('andromeda')[0]
    const p1 = displayedPlaceholder(obs, bands[0].id, bands)
    const p2 = displayedPlaceholder(obs, bands[1].id, bands)
    expect(p1.hue).not.toBe(p2.hue)
    expect(p1.seed).not.toBe(p2.seed)
  })

  it('displayedPlaceholder preserves style', () => {
    const obs = provider.getObservations('andromeda')[0]
    const p = displayedPlaceholder(obs, bands[0].id, bands)
    expect(p.style).toBe(obs.imagePlaceholder.style)
  })

  it('nearestIndex handles 0 observations', () => {
    expect(nearestIndex(0.5, 0)).toBe(0)
    expect(nearestIndex(0.5, 1)).toBe(0)
  })

  it('nearestIndex maps position to correct index', () => {
    expect(nearestIndex(0, 6)).toBe(0)
    expect(nearestIndex(1, 6)).toBe(5)
    expect(nearestIndex(0.5, 6)).toBe(3)
  })

  it('indexToPosition is inverse of nearestIndex', () => {
    for (let i = 0; i < 6; i++) {
      const pos = indexToPosition(i, 6)
      expect(nearestIndex(pos, 6)).toBe(i)
    }
  })
})

describe('ObjectExplorerPage data', () => {
  it('every anchor object has usable display data', () => {
    for (const obj of provider.getObjects().slice(0, 10)) {
      const obs = provider.getObservations(obj.id)
      const story = provider.getObjectStory(obj.id)
      const bands = provider.getSpectralBands(obj.id)
      expect(story).toBeDefined()
      expect(bands.length).toBeGreaterThanOrEqual(2)
      if (obs.length > 0) {
        const p = displayedPlaceholder(obs[0], bands[0].id, bands)
        expect(p.seed).toBeTruthy()
      }
    }
  })
})
