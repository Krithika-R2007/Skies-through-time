import { create } from 'zustand'
import type { CelestialObject } from '../data/models'
import { playSound } from '../utils/sound'

export interface LabelPos {
  id: string
  name: string
  leftPct: number
  topPct: number
}

export interface FocusTarget {
  id: string
  x: number
  y: number
}

export interface SavedCamera {
  targetX: number
  targetY: number
  distance: number
}

interface MapState {
  selectedObjectId: string | null
  hoverObjectId: string | null
  focusTarget: FocusTarget | null
  labels: LabelPos[]
  pendingNavigation: string | null
  navReady: boolean
  savedCamera: SavedCamera | null
  /** True once the arrival animation + title have played this session. */
  introPlayed: boolean
  markIntroPlayed: () => void

  select: (object: CelestialObject) => void
  setHover: (id: string | null) => void
  requestFocus: (object: CelestialObject) => void
  clearFocus: () => void
  setLabels: (labels: LabelPos[]) => void
  clearSelection: () => void
  markNavReady: () => void
  clearPendingNavigation: () => void
  saveCamera: (camera: SavedCamera) => void
}

export const useMapStore = create<MapState>((set) => ({
  selectedObjectId: null,
  hoverObjectId: null,
  focusTarget: null,
  labels: [],
  pendingNavigation: null,
  navReady: false,
  savedCamera: null,
  introPlayed: false,
  markIntroPlayed: () => set({ introPlayed: true }),

  select: (object) => {
    playSound('travel')
    set({
      selectedObjectId: object.id,
      focusTarget: { id: object.id, x: object.visualPosition.x, y: object.visualPosition.y },
      pendingNavigation: `/explore/${object.id}`,
      navReady: false,
    })
  },
  setHover: (id) => set({ hoverObjectId: id }),
  requestFocus: (object) =>
    set({ focusTarget: { id: object.id, x: object.visualPosition.x, y: object.visualPosition.y } }),
  clearFocus: () => set({ focusTarget: null }),
  setLabels: (labels) => set({ labels }),
  clearSelection: () => set({ selectedObjectId: null, focusTarget: null }),
  markNavReady: () => set({ navReady: true }),
  clearPendingNavigation: () => set({ pendingNavigation: null, navReady: false }),
  saveCamera: (camera) => set({ savedCamera: camera }),
}))
