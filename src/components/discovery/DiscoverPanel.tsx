import { useState } from 'react'
import { Crosshair, Radio, Satellite, Scan, Sparkles, Star } from 'lucide-react'
import type { CelestialObject } from '../../data/models'
import type { ChangeCandidate, GaiaClassification, GhostPrediction, MotionResult, MovingSource, NeossatObs } from '../../data/api/types'
import { detectMotion, getChanges, getGaiaClassify, getGhost, getNeossat } from '../../data/api/endpoints'
import { describeError } from '../../data/api/client'
import { RoundedButton } from '../shared/RoundedButton'
import { SkyPlot } from './SkyPlot'
import { UnWiseBlinkPanel } from './UnWiseBlinkPanel'
import type { PlotLine, PlotPoint } from './SkyPlot'

const CARD = 'rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md'
const CONF: Record<string, string> = {
  high: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200',
  medium: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  low: 'border-red-300/40 bg-red-300/10 text-red-200',
}

const CANDIDATE_STYLES: Record<string, { border: string; badge: string; label: string }> = {
  known_star: { border: 'border-white/15', badge: 'border-white/20 text-lavender/70', label: 'Known star (Gaia)' },
  known_fast_mover: { border: 'border-amber-300/30', badge: 'border-amber-300/40 bg-amber-300/10 text-amber-200', label: 'Known fast mover' },
  candidate_solar_system: { border: 'border-red-400/40', badge: 'border-red-400/40 bg-red-400/10 text-red-300', label: '🔴 Candidate: solar system object' },
  candidate_brown_dwarf: { border: 'border-purple-400/40', badge: 'border-purple-400/40 bg-purple-400/10 text-purple-300', label: '🟣 Candidate: brown dwarf' },
}

function useRunner<T>() {
  const [data, setData] = useState<T | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const run = async (fn: () => Promise<T>) => {
    setBusy(true)
    setErr('')
    try {
      setData(await fn())
    } catch (e) {
      setErr(describeError(e))
    } finally {
      setBusy(false)
    }
  }
  return { data, busy, err, run, reset: () => setData(null) }
}

function Changes({ obj }: { obj: CelestialObject }) {
  const r = useRunner<ChangeCandidate[]>()
  const pts: PlotPoint[] = (r.data ?? []).map((c) => ({
    ra: c.ra, dec: c.dec, color: c.is_moving_candidate ? '#ffb02e' : '#5ad9e6', r: 3 + Math.min(6, c.snr / 3),
  }))
  return (
    <div className={CARD}>
      <p className="font-body text-sm text-lavender/75">
        Compares every pair of consecutive visits to this field and lists positions where something brightened, faded or moved.
        This downloads all epochs and can take a minute.
      </p>
      <RoundedButton className="mt-3" variant="accent" disabled={r.busy} onClick={() => r.run(() => getChanges(obj.rightAscension, obj.declination, 0.05))}>
        <Scan className="h-4 w-4" />
        {r.busy ? 'Scanning every epoch\u2026' : 'Scan field for changes'}
      </RoundedButton>
      {r.err && <p className="mt-3 font-body text-sm text-amber-300/90">{r.err}</p>}
      {r.data && (
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,26rem)_1fr]">
          <SkyPlot ra0={obj.rightAscension} dec0={obj.declination} points={[{ ra: obj.rightAscension, dec: obj.declination, color: '#ffffff', r: 2, hollow: true }, ...pts]} minExtentDeg={0.025} />
          <div>
            <p className="font-heading text-sm text-soft-white">
              {r.data.length === 0 ? 'No significant changes found in this field.' : `${r.data.length} candidate${r.data.length === 1 ? '' : 's'}, ranked by motion score`}
            </p>
            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1 font-body text-xs text-lavender/75">
              {r.data.slice(0, 25).map((c, i) => (
                <li key={i} className="rounded-lg bg-white/5 px-3 py-1.5">
                  {c.ra.toFixed(4)}{'\u00b0'}, {c.dec.toFixed(4)}{'\u00b0'} {'\u00b7'} SNR {c.snr.toFixed(1)} {'\u00b7'} score {c.dipole_score.toFixed(2)} {'\u00b7'}{' '}
                  <span className={c.is_moving_candidate ? 'text-amber-300' : 'text-cyan'}>
                    {c.is_moving_candidate ? 'moving object' : 'variable source'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function Motion({ obj }: { obj: CelestialObject }) {
  const m = useRunner<MotionResult>()
  const g = useRunner<GhostPrediction>()
  const n = useRunner<NeossatObs[]>()
  const c = useRunner<GaiaClassification>()
  const [sel, setSel] = useState<MovingSource | null>(null)

  const choose = (s: MovingSource) => {
    setSel(s)
    g.reset()
    n.reset()
    c.reset()
  }
  const points: PlotPoint[] = []
  const lines: PlotLine[] = []
  m.data?.moving_sources.forEach((s) => {
    const active = sel?.source_id === s.source_id
    const color = active ? '#ffb02e' : 'rgba(90,217,230,0.8)'
    lines.push({ pts: s.positions.map((p) => ({ ra: p.ra, dec: p.dec })), color })
    s.positions.forEach((p) => points.push({ ra: p.ra, dec: p.dec, color, r: active ? 3.5 : 2.5 }))
  })
  if (g.data) {
    points.push({ ra: g.data.predicted_ra, dec: g.data.predicted_dec, color: '#c9a0ff', hollow: true, r: 6, label: 'ghost' })
    lines.push({ pts: [{ ra: g.data.current_ra, dec: g.data.current_dec }, { ra: g.data.predicted_ra, dec: g.data.predicted_dec }], color: '#ffb02e', dashed: true, arrow: true })
  }

  return (
    <div className={CARD}>
      <p className="font-body text-sm text-lavender/75">
        Finds point sources in every epoch, matches them across visits and fits a straight line to anything that shifts. This
        downloads all epochs and can take 10 to 30 seconds.
      </p>
      <RoundedButton className="mt-3" variant="accent" disabled={m.busy} onClick={() => { setSel(null); g.reset(); n.reset(); c.reset(); void m.run(() => detectMotion(obj.rightAscension, obj.declination, 0.1)) }}>
        <Crosshair className="h-4 w-4" />
        {m.busy ? 'Tracking sources\u2026' : 'Track moving objects'}
      </RoundedButton>
      {m.err && <p className="mt-3 font-body text-sm text-amber-300/90">{m.err}</p>}
      {m.data && (
        <div className="mt-4">
          <p className="font-heading text-sm text-soft-white">
            {m.data.n_sources_detected} sources detected, {m.data.n_moving} moving
          </p>
          {m.data.moving_sources.length === 0 ? (
            <p className="mt-1 font-body text-sm text-lavender/60">Nothing in this field moved fast enough to measure. That is normal for most fields.</p>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,26rem)_1fr]">
              <SkyPlot ra0={m.data.ra} dec0={m.data.dec} points={points} lines={lines} />
              <div>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {m.data.moving_sources.map((s) => (
                    <li key={s.source_id}>
                      <button
                        onClick={() => choose(s)}
                        className={`w-full rounded-lg px-3 py-1.5 text-left font-body text-xs transition-colors ${
                          sel?.source_id === s.source_id ? 'bg-neon/15 text-neon' : 'bg-white/5 text-lavender/75 hover:bg-white/10'
                        }`}
                      >
                        {s.source_id} {'\u00b7'} {s.proper_motion_arcsec_yr.toFixed(2)}{'\u2033'}/yr {'\u00b7'} {s.n_epochs} epochs {'\u00b7'} SNR {s.snr.toFixed(1)}
                      </button>
                    </li>
                  ))}
                </ul>
                {sel && (
                  <div className="mt-3 space-y-3">
                    <p className="font-body text-xs text-lavender/65">
                      Velocity ({sel.vx_arcsec_yr.toFixed(2)} {'\u00b1'} {sel.vx_err.toFixed(2)}, {sel.vy_arcsec_yr.toFixed(2)} {'\u00b1'} {sel.vy_err.toFixed(2)}) {'\u2033'}/yr
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <RoundedButton size="sm" variant="secondary" disabled={g.busy} onClick={() => g.run(() => getGhost(obj.rightAscension, obj.declination, 0.1, sel.source_id))}>
                        <Sparkles className="h-4 w-4" />
                        {g.busy ? 'Predicting\u2026' : 'Where will it be next year?'}
                      </RoundedButton>
                      <RoundedButton size="sm" variant="secondary" disabled={n.busy} onClick={() => n.run(() => getNeossat(sel.ra_initial, sel.dec_initial, 0.5))}>
                        <Satellite className="h-4 w-4" />
                        {n.busy ? 'Checking\u2026' : 'Cross-check with NEOSSat'}
                      </RoundedButton>
                      <RoundedButton size="sm" variant="secondary" disabled={c.busy} onClick={() => c.run(() => getGaiaClassify(sel.ra_initial, sel.dec_initial, 5, sel.proper_motion_arcsec_yr))}>
                        <Star className="h-4 w-4" />
                        {c.busy ? 'Classifying\u2026' : 'Is this a known star?'}
                      </RoundedButton>
                    </div>
                    {g.err && <p className="font-body text-sm text-amber-300/90">{g.err}</p>}
                    {g.data && (
                      <p className="font-body text-sm text-lavender/85">
                        Predicted: RA {g.data.predicted_ra.toFixed(5)}{'\u00b0'}, Dec {g.data.predicted_dec.toFixed(5)}{'\u00b0'}
                        <span className={`ml-2 rounded-full border px-2.5 py-0.5 font-heading text-[11px] uppercase tracking-wider ${CONF[g.data.confidence_label] ?? CONF.low}`}>
                          {g.data.confidence_label} confidence
                        </span>
                        <span className="mt-1 block text-xs text-lavender/50">
                          {g.data.n_epochs_used} epochs used, fit residual {g.data.fit_residual_arcsec.toFixed(2)}{'\u2033'}
                        </span>
                      </p>
                    )}
                    {n.err && <p className="font-body text-sm text-amber-300/90">{n.err}</p>}
                    {n.data && (
                      <p className="font-body text-sm text-lavender/85">
                        {n.data.length === 0
                          ? 'NEOSSat has no observations of this part of the sky.'
                          : `NEOSSat observed this area ${n.data.length} time${n.data.length === 1 ? '' : 's'}${n.data[0].start_time ? `, most recently ${n.data[0].start_time.slice(0, 10)}` : ''}. That can help confirm a real mover.`}
                      </p>
                    )}
                    {c.err && <p className="font-body text-sm text-amber-300/90">{c.err}</p>}
                    {c.data && (() => {
                      const style = CANDIDATE_STYLES[c.data.candidate_type] ?? CANDIDATE_STYLES.known_star
                      return (
                        <div className={`rounded-xl border p-3 ${style.border}`}>
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 font-heading text-[11px] uppercase tracking-wider ${style.badge}`}>
                            {style.label}
                          </span>
                          <p className="mt-2 font-body text-sm leading-relaxed text-lavender/85">{c.data.narrative}</p>
                          {c.data.gaia_source_id && (
                            <p className="mt-1.5 font-body text-xs text-lavender/50">
                              Gaia DR3 {c.data.gaia_source_id}
                              {c.data.separation_arcsec !== null ? ` · ${c.data.separation_arcsec.toFixed(2)}\u2033 offset` : ''}
                              {c.data.gaia_distance_pc !== null ? ` · ${c.data.gaia_distance_pc.toFixed(1)} pc` : ''}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DiscoverPanel({ obj }: { obj: CelestialObject }) {
  const [tab, setTab] = useState<'changes' | 'motion' | 'neowise'>('changes')
  const TABS: { id: 'changes' | 'motion' | 'neowise'; label: string }[] = [
    { id: 'changes', label: 'Changes in the field' },
    { id: 'motion', label: 'Moving objects' },
    { id: 'neowise', label: 'NEOWISE 2010–2018' },
  ]
  return (
    <div className="w-full max-w-5xl">
      <div className="mb-4 flex justify-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-5 py-2 font-heading text-sm transition-colors ${tab === t.id ? 'bg-white/15 text-soft-white' : 'text-lavender/60 hover:text-soft-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'changes' && <Changes obj={obj} />}
      {tab === 'motion' && <Motion obj={obj} />}
      {tab === 'neowise' && <UnWiseBlinkPanel obj={obj} />}
    </div>
  )
}
