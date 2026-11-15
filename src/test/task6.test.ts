import { describe, it, expect, beforeEach } from 'vitest'
import { useMapStore } from '../store/mapStore'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'

const provider = new MockAstronomyProvider()

describe('mapStore — cinematic selection + camera persistence', () => {
  beforeEach(() => {
    useMapStore.setState({
      selectedObjectId: null,
      hoverObjectId: null,
      focusTarget: null,
      labels: [],
      pendingNavigation: null,
      navReady: false,
      savedCamera: null,
    })
  })

  it('select queues navigation to the explore route and arms a focus target', () => {
    const obj = provider.getObjectById('andromeda')!
    useMapStore.getState().select(obj)
    const s = useMapStore.getState()
    expect(s.selectedObjectId).toBe('andromeda')
    expect(s.focusTarget).toEqual({ id: 'andromeda', x: obj.visualPosition.x, y: obj.visualPosition.y })
    expect(s.pendingNavigation).toBe('/explore/andromeda')
    expect(s.navReady).toBe(false)
  })

  it('markNavReady signals the dolly is complete', () => {
    useMapStore.getState().markNavReady()
    expect(useMapStore.getState().navReady).toBe(true)
  })

  it('clearPendingNavigation resets both pending and ready', () => {
    const obj = provider.getObjectById('betelgeuse')!
    useMapStore.getState().select(obj)
    useMapStore.getState().markNavReady()
    useMapStore.getState().clearPendingNavigation()
    const s = useMapStore.getState()
    expect(s.pendingNavigation).toBeNull()
    expect(s.navReady).toBe(false)
  })

  it('saveCamera stores the view to restore on return', () => {
    useMapStore.getState().saveCamera({ targetX: 100, targetY: -50, distance: 1400 })
    expect(useMapStore.getState().savedCamera).toEqual({ targetX: 100, targetY: -50, distance: 1400 })
  })

  it('clearSelection leaves camera persistence untouched', () => {
    const obj = provider.getObjectById('betelgeuse')!
    useMapStore.getState().select(obj)
    useMapStore.getState().saveCamera({ targetX: 1, targetY: 2, distance: 3 })
    useMapStore.getState().clearSelection()
    const s = useMapStore.getState()
    expect(s.selectedObjectId).toBeNull()
    expect(s.focusTarget).toBeNull()
    expect(s.savedCamera).not.toBeNull()
  })
})
