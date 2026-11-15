import { describe, it, expect } from 'vitest'
import { formatObservationDate } from '../utils/observation'
import { gridColumns } from '../components/comparison/ComparisonViewer'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'
import { useMapStore } from '../store/mapStore'

const provider = new MockAstronomyProvider()

describe('formatObservationDate', () => {
  it('formats ISO dates in UTC', () => {
    expect(formatObservationDate('2019-01-15')).toBe('15 Jan 2019')
  })
  it('falls back to the raw string when invalid', () => {
    expect(formatObservationDate('not-a-date')).toBe('not-a-date')
  })
})

describe('compare grid layout', () => {
  it('uses 2 columns side by side for a pair, and 3 for six', () => {
    expect(gridColumns(2)).toContain('sm:grid-cols-2')
    expect(gridColumns(6)).toContain('lg:grid-cols-3')
  })
})

describe('story content', () => {
  it('has multi-paragraph sections for every type', () => {
    for (const id of ['betelgeuse', 'jupiter', 'pluto', 'halley', 'vesta', 'luhman16', 'andromeda']) {
      const story = provider.getObjectStory(id)!
      for (const s of story.sections) {
        expect(s.description.split('\n\n').length).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

describe('intro flag', () => {
  it('can be marked played once', () => {
    useMapStore.setState({ introPlayed: false })
    useMapStore.getState().markIntroPlayed()
    expect(useMapStore.getState().introPlayed).toBe(true)
  })
})
