import { describe, it, expect, beforeEach } from 'vitest'
import { labelBucket, shouldShowLabels, MAX_LABELS } from '../utils/labelBuckets'
import { useMapStore } from '../store/mapStore'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'

const provider = new MockAstronomyProvider()

describe('label buckets', () => {
  it('hides labels on the wide view', () => {
    expect(labelBucket(1000)).toBe('none')
    expect(shouldShowLabels(1000)).toBe(false)
  })
  it('shows sparse labels at medium zoom', () => {
    expect(labelBucket(500)).toBe('sparse')
    expect(shouldShowLabels(500)).toBe(true)
  })
  it('shows full labels when zoomed in', () => {
    expect(labelBucket(100)).toBe('full')
    expect(shouldShowLabels(100)).toBe(true)
  })
  it('caps the number of labels', () => {
    expect(MAX_LABELS).toBeLessThanOrEqual(30)
  })
})

describe('mapStore selection', () => {
  beforeEach(() => {
    useMapStore.setState({ selectedObjectId: null, hoverObjectId: null, focusTarget: null, labels: [] })
  })

  it('select sets the selected object and a focus target at its position', () => {
    const obj = provider.getObjectById('andromeda')!
    useMapStore.getState().select(obj)
    const s = useMapStore.getState()
    expect(s.selectedObjectId).toBe('andromeda')
    expect(s.focusTarget).toEqual({ id: 'andromeda', x: obj.visualPosition.x, y: obj.visualPosition.y })
  })

  it('setHover updates the hover id', () => {
    useMapStore.getState().setHover('betelgeuse')
    expect(useMapStore.getState().hoverObjectId).toBe('betelgeuse')
    useMapStore.getState().setHover(null)
    expect(useMapStore.getState().hoverObjectId).toBeNull()
  })

  it('clearFocus removes the focus target but keeps the selection', () => {
    const obj = provider.getObjectById('betelgeuse')!
    useMapStore.getState().select(obj)
    useMapStore.getState().clearFocus()
    const s = useMapStore.getState()
    expect(s.focusTarget).toBeNull()
    expect(s.selectedObjectId).toBe('betelgeuse')
  })

  it('clearSelection resets selection and focus', () => {
    const obj = provider.getObjectById('betelgeuse')!
    useMapStore.getState().select(obj)
    useMapStore.getState().clearSelection()
    const s = useMapStore.getState()
    expect(s.selectedObjectId).toBeNull()
    expect(s.focusTarget).toBeNull()
  })

  it('setLabels stores projected label positions', () => {
    useMapStore.getState().setLabels([{ id: 'x', name: 'X', leftPct: 50, topPct: 50 }])
    expect(useMapStore.getState().labels).toHaveLength(1)
  })
})
