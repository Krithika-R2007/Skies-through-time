import { create } from 'zustand'

const KEY = 'stt-muted'

function readMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

interface SoundState {
  muted: boolean
  toggle: () => void
}

// Sound on/off, remembered between visits.
export const useSoundStore = create<SoundState>((set, get) => ({
  muted: readMuted(),
  toggle: () => {
    const muted = !get().muted
    try {
      localStorage.setItem(KEY, muted ? '1' : '0')
    } catch {
      /* storage unavailable: still works for this session */
    }
    set({ muted })
  },
}))
