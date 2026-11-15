import { useState } from 'react'
import { GitCompare } from 'lucide-react'
import type { Observation } from '../../data/models'
import type { ChangeCandidate, CompareResult } from '../../data/api/types'
import { compareEpochs, compareImageUrl } from '../../data/api/endpoints'
import { describeError } from '../../data/api/client'
import { RoundedButton } from '../shared/RoundedButton'

export function MarkedImage({ src, markers, label }: { src: string; markers?: ChangeCandidate[]; label: string }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [failed, setFailed] = useState(false)
  return (
    <figure>
      <figcaption className="mb-1.5 font-heading text-sm tracking-wide text-cyan">{label}</figcaption>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        {failed ? (
          <div className="flex aspect-square items-center justify-center font-body text-sm text-lavender/50">Image unavailable</div>
        ) : (
          <img
            src={src}
            alt={label}
            className="block h-auto w-full"
            onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setFailed(true)}
          />
        )}
        {size && markers && markers.length > 0 && (
          <svg viewBox={`0 0 ${size.w} ${size.h}`} className="pointer-events-none absolute inset-0 h-full w-full">
            {markers.map((m, i) => (
              <circle
                key={i}
                cx={m.x_pix}
                cy={m.y_pix}
                r={Math.max(4, size.w * 0.045)}
                fill="none"
                stroke={m.is_moving_candidate ? '#ffb02e' : '#5ad9e6'}
                strokeWidth={Math.max(1, size.w * 0.008)}
              />
            ))}
          </svg>
        )}
      </div>
    </figure>
  )
}

// Aligns two epochs on the backend and shows the colour difference image. Blue means the
// source got brighter in the newer epoch, red means fainter.
export function DiffPanel({ a, b }: { a: Observation; b: Observation }) {
  const [res, setRes] = useState<{ key: string; data: CompareResult } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const key = `${a.id}|${b.id}`
  const ok = a.live && b.live && a.id !== b.id
  const run = async () => {
    if (!a.live || !b.live) return
    setBusy(true)
    setErr('')
    try {
      setRes({ key, data: await compareEpochs(a.live.renderUrl, b.live.renderUrl, a.live.obsid, b.live.obsid) })
    } catch (e) {
      setErr(describeError(e))
    } finally {
      setBusy(false)
    }
  }
  const r = res && res.key === key ? res.data : null
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3">
        <RoundedButton variant="accent" size="md" disabled={!ok || busy} onClick={run}>
          <GitCompare className="h-4 w-4" />
          {busy ? 'Aligning and subtracting\u2026' : `Reveal what changed: ${a.observationEpoch} \u2192 ${b.observationEpoch}`}
        </RoundedButton>
        <p className="font-body text-xs text-lavender/55">
          The backend aligns both epochs, subtracts them and looks for significant differences.
        </p>
      </div>
      {err && <p className="mt-3 font-body text-sm text-amber-300/90">{err}</p>}
      {r && (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MarkedImage src={compareImageUrl(r.png_a_url)} label={`Before \u00b7 ${a.observationEpoch}`} />
            <MarkedImage src={compareImageUrl(r.png_b_url)} label={`After \u00b7 ${b.observationEpoch}`} />
            <MarkedImage src={compareImageUrl(r.png_diff_url)} markers={r.change_candidates} label="Difference" />
          </div>
          <p className="mt-3 font-body text-xs text-lavender/60">
            <span className="text-sky-300">Blue</span> = brighter later, <span className="text-red-300">red</span> = fainter later.
            Amber rings mark likely movers, cyan rings other changes.
          </p>
          <p className="mt-2 font-heading text-sm text-soft-white">
            {r.n_changes === 0 ? 'No significant change detected between these epochs.' : `${r.n_changes} significant change${r.n_changes === 1 ? '' : 's'} found`}
          </p>
          {r.change_candidates.length > 0 && (
            <ul className="mt-2 grid gap-1.5 font-body text-xs text-lavender/75 sm:grid-cols-2">
              {r.change_candidates.slice(0, 8).map((c, i) => (
                <li key={i} className="rounded-lg bg-white/5 px-3 py-1.5">
                  RA {c.ra.toFixed(4)}{'\u00b0'}, Dec {c.dec.toFixed(4)}{'\u00b0'} {'\u00b7'} SNR {c.snr.toFixed(1)} {'\u00b7'}{' '}
                  <span className={c.is_moving_candidate ? 'text-amber-300' : 'text-cyan'}>
                    {c.is_moving_candidate ? 'possible mover' : 'brightness change'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
