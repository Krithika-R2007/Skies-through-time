import { useState } from 'react'
import { Activity } from 'lucide-react'
import type { Spectrum } from '../../data/api/types'
import { getSpectrum } from '../../data/api/endpoints'
import { describeError } from '../../data/api/client'
import { RoundedButton } from '../shared/RoundedButton'

const W = 640
const H = 240
const PAD = { l: 52, r: 14, t: 14, b: 34 }

function Chart({ s, markerUm }: { s: Spectrum; markerUm?: number }) {
  const pts = s.points.filter((p) => Number.isFinite(p.flux_mjy_sr) && Number.isFinite(p.wavelength_um))
  if (pts.length < 2) return <p className="font-body text-sm text-lavender/60">No spectral points returned.</p>
  const xs = pts.map((p) => p.wavelength_um)
  const lo = pts.map((p) => p.flux_mjy_sr - (p.flux_error_mjy_sr ?? 0))
  const hi = pts.map((p) => p.flux_mjy_sr + (p.flux_error_mjy_sr ?? 0))
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  let y0 = Math.min(...lo), y1 = Math.max(...hi)
  if (y1 - y0 < 1e-12) { y0 -= 1; y1 += 1 }
  const padY = (y1 - y0) * 0.08
  y0 -= padY; y1 += padY
  const X = (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r)
  const Y = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b)
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.wavelength_um).toFixed(1)},${Y(p.flux_mjy_sr).toFixed(1)}`).join(' ')
  const xTicks = [0.75, 1.5, 2.5, 3.5, 4.5, 5].filter((t) => t >= x0 - 0.01 && t <= x1 + 0.01)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => y0 + f * (y1 - y0))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Infrared spectrum: flux against wavelength">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={Y(t)} y2={Y(t)} stroke="rgba(255,255,255,0.07)" />
          <text x={PAD.l - 6} y={Y(t) + 3} textAnchor="end" fontSize="9" fill="rgba(200,190,255,0.55)">
            {Math.abs(t) >= 100 || (Math.abs(t) < 0.01 && t !== 0) ? t.toExponential(1) : t.toFixed(2)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={t} x={X(t)} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="rgba(200,190,255,0.55)">
          {t}
        </text>
      ))}
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="rgba(200,190,255,0.7)">
        Wavelength ({'\u00b5'}m)
      </text>
      <text transform={`translate(11 ${H / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="rgba(200,190,255,0.7)">
        Flux (MJy/sr)
      </text>
      {pts.map((p, i) =>
        p.flux_error_mjy_sr ? (
          <line key={i} x1={X(p.wavelength_um)} x2={X(p.wavelength_um)} y1={Y(p.flux_mjy_sr - p.flux_error_mjy_sr)} y2={Y(p.flux_mjy_sr + p.flux_error_mjy_sr)} stroke="rgba(90,217,230,0.35)" />
        ) : null,
      )}
      <path d={path} fill="none" stroke="#5ad9e6" strokeWidth="1.6" />
      {markerUm !== undefined && markerUm >= x0 && markerUm <= x1 && (
        <line x1={X(markerUm)} x2={X(markerUm)} y1={PAD.t} y2={H - PAD.b} stroke="#ffb02e" strokeDasharray="3 3" />
      )}
    </svg>
  )
}

// On-demand quick-look spectrum for the selected observation. The backend measures
// aperture photometry at the target, so the request is explicit rather than automatic.
export function SpectrumChart({
  ra,
  dec,
  url,
  markerUm,
}: {
  ra: number
  dec: number
  url: string
  markerUm?: number
}) {
  const [s, setS] = useState<{ url: string; data: Spectrum } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const run = async () => {
    setBusy(true)
    setErr('')
    try {
      setS({ url, data: await getSpectrum(ra, dec, url) })
    } catch (e) {
      setErr(describeError(e))
    } finally {
      setBusy(false)
    }
  }
  const current = s && s.url === url ? s.data : null
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <RoundedButton variant="secondary" size="sm" onClick={run} disabled={busy}>
          <Activity className="h-4 w-4" />
          {busy ? 'Measuring\u2026' : current ? 'Measure again' : 'Measure spectrum'}
        </RoundedButton>
        <span className="font-body text-xs text-lavender/50">Brightness of the target at every infrared wavelength.</span>
      </div>
      {err && <p className="mt-3 font-body text-sm text-amber-300/90">{err}</p>}
      {current && (
        <div className="mt-3">
          <Chart s={current} markerUm={markerUm} />
          <p className="mt-1 font-body text-xs text-lavender/50">{current.note}</p>
        </div>
      )}
    </div>
  )
}
