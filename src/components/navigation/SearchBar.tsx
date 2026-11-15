import { useMemo, useState } from 'react'
import { Globe2, Search, X } from 'lucide-react'
import { useDataProvider } from '../../data/providers/DataContext'
import { useMapStore } from '../../store/mapStore'
import { useFilterStore } from '../../store/filterStore'
import { useBackendStore } from '../../store/backendStore'
import { OBJECT_TYPE_LABELS } from '../../data/models'
import { searchSky } from '../../data/api/endpoints'
import { describeError } from '../../data/api/client'
import type { SearchResult } from '../../data/api/types'

// "269.452, 4.6934" or "269.452 4.6934". The backend resolves these without any network
// call too, so this works offline.
function parseCoordinates(q: string): SearchResult | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(q)
  if (!m) return null
  const ra = Number(m[1])
  const dec = Number(m[2])
  if (!(ra >= 0 && ra < 360 && dec >= -90 && dec <= 90)) return null
  return { query: q, ra, dec, name: null, object_type: null, source: 'coordinates', gaia_source_id: null }
}

export function SearchBar() {
  const provider = useDataProvider()
  const select = useMapStore((s) => s.select)
  const searchQuery = useFilterStore((s) => s.searchQuery)
  const setSearch = useFilterStore((s) => s.setSearch)
  const fullscreen = useFilterStore((s) => s.fullscreen)
  const backend = useBackendStore((s) => s.status)
  const [focused, setFocused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const results = useMemo(
    () => provider.searchObjects(searchQuery).slice(0, 8),
    [provider, searchQuery],
  )
  const coords = useMemo(() => parseCoordinates(searchQuery), [searchQuery])
  if (fullscreen) return null
  const choose = (id: string) => {
    const obj = provider.getObjectById(id)
    if (obj) select(obj)
    setSearch('')
    setFocused(false)
  }
  const openResolved = (r: SearchResult) => {
    const obj = provider.registerResolved?.(r)
    if (obj) select(obj)
    setSearch('')
    setFocused(false)
  }
  // Names and Gaia IDs go to the backend (SIMBAD / Gaia); coordinates resolve locally.
  const resolveOnline = async () => {
    const q = searchQuery.trim()
    if (!q) return
    if (coords) return openResolved(coords)
    setBusy(true)
    setError('')
    try {
      openResolved(await searchSky(q))
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }
  const canOnline = backend !== 'offline' && searchQuery.trim().length >= 2
  return (
    <div className="absolute left-[5rem] right-4 top-4 z-30 md:left-1/2 md:right-auto md:w-[28rem] md:-translate-x-1/2">
      <div className="relative flex items-center rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-md transition-colors focus-within:border-cyan/40 focus-within:shadow-[0_0_24px_rgba(90,217,230,0.2)]">
        <Search className="mr-2 h-4 w-4 shrink-0 text-lavender/60" />
        <input
          value={searchQuery}
          onChange={(e) => { setSearch(e.target.value); setError('') }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            if (coords) openResolved(coords)
            else if (results[0]) choose(results[0].id)
            else if (canOnline) void resolveOnline()
          }}
          placeholder={'Search a name, Gaia ID or RA, Dec\u2026'}
          className="font-heading w-full bg-transparent text-sm text-soft-white placeholder:text-lavender/40 focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => { setSearch(''); setError('') }} aria-label="Clear search" className="ml-2 text-lavender/50 transition-colors hover:text-soft-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {focused && searchQuery.trim() && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md">
          {results.map((o) => (
            <button
              key={o.id}
              onClick={() => choose(o.id)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-white/10"
            >
              <span className="font-heading text-sm text-soft-white">{o.name}</span>
              <span className="font-body text-[10px] uppercase tracking-wider text-lavender/45">{OBJECT_TYPE_LABELS[o.objectType]}</span>
            </button>
          ))}
          {coords && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => openResolved(coords)}
              className="flex w-full items-center gap-2 border-t border-white/5 px-4 py-2.5 text-left transition-colors hover:bg-white/10"
            >
              <Globe2 className="h-4 w-4 text-cyan" />
              <span className="font-heading text-sm text-soft-white">
                Fly to RA {coords.ra}{'\u00b0'}, Dec {coords.dec}{'\u00b0'}
              </span>
            </button>
          )}
          {canOnline && !coords && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={resolveOnline}
              disabled={busy}
              className="flex w-full items-center gap-2 border-t border-white/5 px-4 py-2.5 text-left transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              <Globe2 className="h-4 w-4 text-cyan" />
              <span className="font-heading text-sm text-soft-white">
                {busy ? 'Looking it up\u2026' : `Look up \u201c${searchQuery.trim()}\u201d in SIMBAD / Gaia`}
              </span>
            </button>
          )}
          {results.length === 0 && !coords && !canOnline && (
            <p className="px-4 py-3 font-body text-xs text-lavender/50">
              No objects found.{backend === 'offline' ? ' Online lookup is unavailable right now.' : ''}
            </p>
          )}
          {error && <p className="border-t border-white/5 px-4 py-2.5 font-body text-xs text-amber-300/90">{error}</p>}
        </div>
      )}
    </div>
  )
}
