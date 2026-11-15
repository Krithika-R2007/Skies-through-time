import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from '../store/filterStore'

describe('filterStore — type filters', () => {
  beforeEach(() => {
    useFilterStore.setState({ activeTypes: [], searchQuery: '', fullscreen: false })
  })

  it('starts with all types (empty array = all)', () => {
    expect(useFilterStore.getState().activeTypes).toEqual([])
  })

  it('toggleType from all selects that type only', () => {
    useFilterStore.getState().toggleType('star')
    expect(useFilterStore.getState().activeTypes).toEqual(['star'])
  })

  it('toggleType toggles a type back off, returning to all', () => {
    useFilterStore.getState().toggleType('star')
    useFilterStore.getState().toggleType('star')
    expect(useFilterStore.getState().activeTypes).toEqual([])
  })

  it('toggleType accumulates multiple types', () => {
    useFilterStore.getState().toggleType('star')
    useFilterStore.getState().toggleType('comet')
    expect(useFilterStore.getState().activeTypes).toEqual(['star', 'comet'])
  })

  it('setAll resets to all', () => {
    useFilterStore.getState().toggleType('star')
    useFilterStore.getState().toggleType('galaxy')
    useFilterStore.getState().setAll()
    expect(useFilterStore.getState().activeTypes).toEqual([])
  })
})

describe('filterStore — search & fullscreen', () => {
  beforeEach(() => {
    useFilterStore.setState({ searchQuery: '', fullscreen: false })
  })

  it('setSearch stores the query', () => {
    useFilterStore.getState().setSearch('andromeda')
    expect(useFilterStore.getState().searchQuery).toBe('andromeda')
  })

  it('toggleFullscreen flips the flag', () => {
    useFilterStore.getState().toggleFullscreen()
    expect(useFilterStore.getState().fullscreen).toBe(true)
    useFilterStore.getState().toggleFullscreen()
    expect(useFilterStore.getState().fullscreen).toBe(false)
  })
})
