import { create } from 'zustand'
import { addWatch, createJournal } from '../data/api/endpoints'
import { useBackendStore } from './backendStore'

// Notes and watchlist. Always kept in localStorage so they work offline; mirrored to the
// backend (PostgreSQL) when it reports the database as available.

const KEY = 'stt-journal-v1'

export interface Note {
  id: string
  objectId: string
  label: string
  ra: number
  dec: number
  text: string
  createdAt: string
  synced: boolean
}

interface Persisted {
  notes: Note[]
  watching: string[]
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Persisted
  } catch {
    /* ignore */
  }
  return { notes: [], watching: [] }
}

function save(p: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable: still works for this session */
  }
}

interface JournalState extends Persisted {
  addNote: (o: { id: string; name: string; ra: number; dec: number }, text: string) => Promise<void>
  removeNote: (id: string) => void
  toggleWatch: (o: { id: string; name: string; ra: number; dec: number }) => Promise<void>
}

export const useJournalStore = create<JournalState>((set, get) => ({
  ...load(),
  addNote: async (o, text) => {
    const note: Note = {
      id: `${Date.now()}`,
      objectId: o.id,
      label: o.name,
      ra: o.ra,
      dec: o.dec,
      text,
      createdAt: new Date().toISOString(),
      synced: false,
    }
    if (useBackendStore.getState().database) {
      try {
        await createJournal({ ra: o.ra, dec: o.dec, size_deg: 0.1, label: o.name, notes: text })
        note.synced = true
      } catch {
        /* keep the local copy */
      }
    }
    const next = { notes: [note, ...get().notes], watching: get().watching }
    save(next)
    set(next)
  },
  removeNote: (id) => {
    const next = { notes: get().notes.filter((n) => n.id !== id), watching: get().watching }
    save(next)
    set(next)
  },
  toggleWatch: async (o) => {
    const on = get().watching.includes(o.id)
    const watching = on ? get().watching.filter((w) => w !== o.id) : [...get().watching, o.id]
    const next = { notes: get().notes, watching }
    save(next)
    set(next)
    if (!on && useBackendStore.getState().database) {
      try {
        await addWatch({ ra: o.ra, dec: o.dec, label: o.name })
      } catch {
        /* local copy stands */
      }
    }
  },
}))
