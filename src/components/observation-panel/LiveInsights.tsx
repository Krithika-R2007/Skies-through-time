import { useState } from 'react'
import { AlertTriangle, Bookmark, BookmarkCheck, PenLine, Radio, Telescope, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CelestialObject, Observation } from '../../data/models'
import type { ObjectObservations } from '../../hooks/useObjectObservations'
import { getCadcCounts, getGaiaCrossmatch } from '../../data/api/endpoints'
import { useAsync } from '../../hooks/useAsync'
import { useJournalStore } from '../../store/journalStore'
import { useBackendStore } from '../../store/backendStore'
import { RoundedButton } from '../shared/RoundedButton'
import { SpectrumChart } from './SpectrumChart'

const PANEL = 'rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md'
const H = 'font-heading text-[11px] uppercase tracking-[0.2em] text-lavender/55'

export function DataSourceBadge({ info }: { info: Pick<ObjectObservations, 'mode' | 'reason'> }) {
  if (info.mode === 'loading') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 font-heading text-[11px] uppercase tracking-wider text-lavender/70">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan/20 border-t-cyan" /> Fetching from NASA
      </span>
    )
  }
  if (info.mode === 'demo' && info.reason) {
    return (
      <span title={info.reason} className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 font-heading text-[11px] uppercase tracking-wider text-amber-200">
        Demonstration data
      </span>
    )
  }
  if (info.mode === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 font-heading text-[11px] uppercase tracking-wider text-cyan">
        <Radio className="h-3 w-3" /> Live NASA SPHEREx data
      </span>
    )
  }
  return null
}

function Anomalies({ obs }: { obs: Observation }) {
  const flags = obs.live?.anomalies ?? []
  if (flags.length === 0) return null
  return (
    <div className="flex gap-2.5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div>
        <p className="font-heading text-sm text-amber-200">Data quality warning for this epoch</p>
        <ul className="mt-1 font-body text-xs text-amber-100/80">
          {flags.map((f, i) => (
            <li key={i}>{f.anomaly_name} ({f.anomaly_type.toLowerCase()})</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Context({ obj }: { obj: CelestialObject }) {
  const gaia = useAsync((signal) => getGaiaCrossmatch(obj.rightAscension, obj.declination, 8, { signal }), obj.id)
  const cadc = useAsync((signal) => getCadcCounts(obj.rightAscension, obj.declination, 0.5, { signal }), obj.id)
  const g = gaia.data
  const entries = cadc.data ? Object.entries(cadc.data) : []
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={PANEL}>
        <p className={H}>Nearest Gaia star</p>
        {gaia.loading ? (
          <p className="mt-2 font-body text-sm text-lavender/50">Searching the Gaia catalogue{'\u2026'}</p>
        ) : g ? (
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-body text-sm text-lavender/80">
            <dt className="text-lavender/50">Gaia DR3</dt><dd className="truncate">{g.source_id}</dd>
            <dt className="text-lavender/50">Magnitude (G)</dt><dd>{g.phot_g_mean_mag?.toFixed(2) ?? '\u2013'}</dd>
            <dt className="text-lavender/50">Distance</dt>
            <dd>{g.distance_pc ? `${g.distance_pc.toFixed(2)} pc (${(g.distance_pc * 3.26156).toFixed(1)} ly)` : '\u2013'}</dd>
            <dt className="text-lavender/50">Proper motion</dt>
            <dd>{g.proper_motion_mas_yr ? `${g.proper_motion_mas_yr.toFixed(1)} mas/yr` : '\u2013'}</dd>
          </dl>
        ) : (
          <p className="mt-2 font-body text-sm text-lavender/55">{gaia.error || 'No catalogued star within 8 arcseconds.'}</p>
        )}
      </div>
      <div className={PANEL}>
        <p className={H}>Other telescopes here</p>
        {cadc.loading ? (
          <p className="mt-2 font-body text-sm text-lavender/50">Asking the CADC archive{'\u2026'}</p>
        ) : entries.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {entries.map(([name, n]) => (
              <span
                key={name}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-heading text-xs ${
                  n > 0 ? 'border-neon/40 text-neon' : 'border-white/10 text-lavender/40'
                }`}
              >
                <Telescope className="h-3 w-3" /> {name} {'\u00b7'} {n}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 font-body text-sm text-lavender/55">{cadc.error || 'No other archive observations found.'}</p>
        )}
      </div>
    </div>
  )
}

function Notes({ obj }: { obj: CelestialObject }) {
  const notes = useJournalStore((s) => s.notes).filter((n) => n.objectId === obj.id)
  const watching = useJournalStore((s) => s.watching.includes(obj.id))
  const addNote = useJournalStore((s) => s.addNote)
  const removeNote = useJournalStore((s) => s.removeNote)
  const toggleWatch = useJournalStore((s) => s.toggleWatch)
  const database = useBackendStore((s) => s.database)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const target = { id: obj.id, name: obj.name, ra: obj.rightAscension, dec: obj.declination }
  return (
    <div>
      <div className="group relative inline-block">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Take note / save"
          className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
            open || notes.length > 0 || watching
              ? 'border-neon/50 bg-neon/15 text-neon shadow-[0_0_18px_rgba(255,176,46,0.3)]'
              : 'border-white/15 bg-black/50 text-lavender hover:border-cyan/40 hover:text-soft-white'
          }`}
        >
          {open ? <X className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
          {notes.length > 0 && !open && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-neon px-1 font-heading text-[10px] font-semibold text-void">
              {notes.length}
            </span>
          )}
        </button>
        <span className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-black/80 px-3 py-1.5 font-heading text-xs text-soft-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Take note / save
        </span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={`${PANEL} mt-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={H}>Notes on {obj.name}</p>
                <RoundedButton variant="secondary" size="sm" onClick={() => toggleWatch(target)}>
                  {watching ? <BookmarkCheck className="h-4 w-4 text-neon" /> : <Bookmark className="h-4 w-4" />}
                  {watching ? 'Watching' : 'Watch this object'}
                </RoundedButton>
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!text.trim()) return
                  void addNote(target, text.trim())
                  setText('')
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  autoFocus
                  placeholder={'What did you notice?'}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-body text-sm text-soft-white placeholder:text-lavender/35 focus:border-cyan/40 focus:outline-none"
                />
                <RoundedButton type="submit" size="sm" variant="primary">Save</RoundedButton>
              </form>
              <p className="mt-1.5 font-body text-[11px] text-lavender/40">
                {database ? 'Saved to your journal and on this device.' : 'Saved on this device.'}
              </p>
              {notes.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
                      <div>
                        <p className="font-body text-sm text-soft-white/90">{n.text}</p>
                        <p className="font-body text-[11px] text-lavender/40">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                      <button onClick={() => removeNote(n.id)} aria-label="Delete note" className="text-lavender/40 hover:text-soft-white">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// Everything below the main explorer: where the data comes from, the archive's own
// summary, quality warnings, a measured spectrum, catalogue context and notes. Live-only
// blocks are hidden when the page is showing demonstration data.
export function LiveInsights({
  obj,
  info,
  current,
  markerUm,
}: {
  obj: CelestialObject
  info: ObjectObservations
  current: Observation | undefined
  markerUm?: number
}) {
  const live = info.mode === 'live' && current?.live
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <DataSourceBadge info={info} />
      </div>
      {live && info.card && (
        <div className={PANEL}>
          <p className={H}>What SPHEREx has seen here</p>
          <p className="mt-2 font-body text-sm leading-relaxed text-lavender/85">{info.card.narrative}</p>
        </div>
      )}
      {current && live && <Anomalies obs={current} />}
      {live && current?.live && current.live.kind !== 'unwise' && (
        <div className={PANEL}>
          <p className={H}>Infrared spectrum</p>
          <div className="mt-3">
            <SpectrumChart ra={obj.rightAscension} dec={obj.declination} url={current.live.renderUrl} markerUm={markerUm} />
          </div>
        </div>
      )}
      {info.mode !== 'loading' && live && <Context obj={obj} />}
      <Notes obj={obj} />
    </section>
  )
}
