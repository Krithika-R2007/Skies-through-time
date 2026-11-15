import { create } from 'zustand'
import { getReadiness } from '../data/api/endpoints'
import { FORCE_DEMO } from '../data/api/client'

export type BackendStatus = 'checking' | 'online' | 'offline'

interface BackendState {
  status: BackendStatus
  /** PostgreSQL reachable (journal / watchlist backed by the server). */
  database: boolean
  redis: boolean
  check: () => Promise<void>
  markOffline: () => void
}

let timer: number | null = null

export const useBackendStore = create<BackendState>((set) => ({
  status: FORCE_DEMO ? 'offline' : 'checking',
  database: false,
  redis: false,
  check: async () => {
    if (FORCE_DEMO) return
    try {
      const r = await getReadiness()
      set({ status: 'online', database: r.database === 'ok', redis: r.redis === 'ok' })
    } catch {
      set({ status: 'offline', database: false, redis: false })
    }
  },
  markOffline: () => set({ status: 'offline' }),
}))

/** Starts one shared health poll. Fast retry while offline, slow while online. */
export function startBackendMonitor() {
  if (timer !== null || FORCE_DEMO) return
  const tick = async () => {
    await useBackendStore.getState().check()
    const next = useBackendStore.getState().status === 'online' ? 60000 : 15000
    timer = window.setTimeout(tick, next)
  }
  void tick()
}
