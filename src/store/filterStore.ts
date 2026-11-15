import { create } from 'zustand'
import type { ObjectType } from '../data/models'

interface FilterState {
  activeTypes: ObjectType[]
  searchQuery: string
  fullscreen: boolean
  showCoverage: boolean
  toggleCoverage: () => void
  toggleType: (type: ObjectType) => void
  setAll: () => void
  setSearch: (query: string) => void
  toggleFullscreen: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  activeTypes: [],
  searchQuery: '',
  fullscreen: false,
  showCoverage: false,
  toggleCoverage: () => set((s) => ({ showCoverage: !s.showCoverage })),
  toggleType: (type) =>
    set((s) => {
      if (s.activeTypes.length === 0) return { activeTypes: [type] }
      if (s.activeTypes.includes(type)) {
        return { activeTypes: s.activeTypes.filter((t) => t !== type) }
      }
      return { activeTypes: [...s.activeTypes, type] }
    }),
  setAll: () => set({ activeTypes: [] }),
  setSearch: (query) => set({ searchQuery: query }),
  toggleFullscreen: () => set((s) => ({ fullscreen: !s.fullscreen })),
}))
