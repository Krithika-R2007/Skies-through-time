import { describe, it, expect } from 'vitest'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'
import { OBJECT_TYPES } from '../data/models'
import { buildObjectBundle } from '../data/mock'
import { CURATED_STORY_IDS } from '../data/mock/curatedStories'

const provider = new MockAstronomyProvider()

describe('MockAstronomyProvider — objects', () => {
  it('returns a curated catalogue of named objects', () => {
    const objects = provider.getObjects()
    expect(objects.length).toBeGreaterThanOrEqual(50)
    expect(objects.length).toBeLessThanOrEqual(120)
  })

  it('every object has stable, deterministic positions across calls', () => {
    const a = provider.getObjects()
    const b = provider.getObjects()
    expect(a.length).toBe(b.length)
    a.forEach((obj, i) => {
      expect(obj.visualPosition).toEqual(b[i].visualPosition)
    })
  })

  it('every object type is represented', () => {
    for (const type of OBJECT_TYPES) {
      expect(provider.getObjectsByType(type).length).toBeGreaterThan(0)
    }
  })

  it('getObjectsByType returns only that type', () => {
    const stars = provider.getObjectsByType('star')
    expect(stars.every((o) => o.objectType === 'star')).toBe(true)
  })

  it('getObjectById resolves known anchors and generated entries', () => {
    expect(provider.getObjectById('andromeda')?.name).toBe('Andromeda Galaxy')
    expect(provider.getObjectById('betelgeuse')?.objectType).toBe('star')
    expect(provider.getObjectById('sirius')?.name).toBe('Sirius')
  })
})

describe('MockAstronomyProvider — search', () => {
  it('matches by name', () => {
    const results = provider.searchObjects('andromeda')
    expect(results.some((o) => o.id === 'andromeda')).toBe(true)
  })

  it('matches by classification', () => {
    const results = provider.searchObjects('comet')
    expect(results.length).toBeGreaterThan(0)
  })

  it('matches by id', () => {
    const results = provider.searchObjects('sirius')
    expect(results.length).toBe(1)
  })

  it('returns empty for empty query', () => {
    expect(provider.searchObjects('')).toEqual([])
    expect(provider.searchObjects('   ')).toEqual([])
  })

  it('search is case-insensitive', () => {
    expect(provider.searchObjects('ANDROMEDA').some((o) => o.id === 'andromeda')).toBe(true)
  })
})

describe('MockAstronomyProvider — observations', () => {
  it('returns observations sorted by date', () => {
    const obs = provider.getObservations('betelgeuse')
    expect(obs.length).toBe(6)
    for (let i = 1; i < obs.length; i++) {
      expect(obs[i].observationDate >= obs[i - 1].observationDate).toBe(true)
    }
  })

  it('all observations are flagged as demo data', () => {
    const obs = provider.getObservations('andromeda')
    expect(obs.every((o) => o.isDemoData)).toBe(true)
  })

  it('getObservationById resolves', () => {
    const obs = provider.getObservations('andromeda')
    const first = obs[0]
    expect(provider.getObservationById(first.id)?.id).toBe(first.id)
  })

  it('handles 0, 1 and many observations', () => {
    const base = provider.getObjectById('sirius')!
    expect(buildObjectBundle({ ...base }, 0).observations.length).toBe(0)
    expect(buildObjectBundle({ ...base }, 1).observations.length).toBe(1)
    expect(provider.getObservations('sirius').length).toBeGreaterThanOrEqual(6)
  })
})
describe('MockAstronomyProvider — comparisons & stories & bands', () => {
  it('produces consecutive comparisons for multi-observation objects', () => {
    const comps = provider.getComparisons('betelgeuse')
    expect(comps.length).toBe(5)
    expect(comps.every((c) => c.isDemoData)).toBe(true)
  })

  it('returns no comparisons for 0/1-observation objects', () => {
    const base = provider.getObjectById('sirius')!
    expect(buildObjectBundle({ ...base }, 0).comparisons).toEqual([])
    expect(buildObjectBundle({ ...base }, 1).comparisons).toEqual([])
  })
  it('every object has a six-section story', () => {
    for (const obj of provider.getObjects()) {
      const story = provider.getObjectStory(obj.id)
      expect(story).toBeDefined()
      expect(story!.sections.length).toBe(6)
      // Researched stories (real NASA content) are not demonstration data.
      expect(story!.isDemoData).toBe(!CURATED_STORY_IDS.includes(obj.id))
    }
  })

  it('spectral bands are demo-flagged and at least 2', () => {
    const bands = provider.getSpectralBands('andromeda')
    expect(bands.length).toBeGreaterThanOrEqual(2)
    expect(bands.every((b) => b.isDemoData)).toBe(true)
  })
})
