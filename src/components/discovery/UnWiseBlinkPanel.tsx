import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Radio } from 'lucide-react'
import type { CelestialObject } from '../../data/models'
import type { UnWiseBlink, UnWiseFrame } from '../../data/api/types'
import { getUnWiseBlink } from '../../data/api/endpoints'
import { describeError } from '../../data/api/client'
import { RoundedButton } from '../shared/RoundedButton'

const CARD = 'rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md'
const FRAME_MS = 500

// Cycles through NEOWISE infrared frames from 2010–2018 (unWISE archive).
// Band 1 = W1 (3.4 µm), Band 2 = W2 (4.6 µm).
export function UnWiseBlinkPanel({ obj }: { obj: CelestialObject }) {
  const [band, setBand] = useState<1 | 2>(1)
  const [blink, setBlink] = useState<UnWiseBlink | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const timerRef = useRef<number | null>(null)

  const load = async (b: 1 | 2) => {
    setBusy(true)
    setErr('')
    setBlink(null)
    setFrameIdx(0)
    setPlaying(false)
    setImgFailed(false)
    try {
      const data = await getUnWiseBlink(obj.rightAscension, obj.declination, b, 100)
      setBlink(data)
      setPlaying(true)
    } catch (e) {
      setErr(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  // Advance frames while playing
  useEffect(() => {
    if (!playing || !blink || blink.frames.length === 0) return
    timerRef.current = window.setTimeout(() => {
      setFrameIdx((i) => (i + 1) % blink.frames.length)
    }, FRAME_MS)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [playing, frameIdx, blink])

  const switchBand = (b: 1 | 2) => {
    setBand(b)
    if (blink) void load(b)
  }

  const currentFrame: UnWiseFrame | undefined = blink?.frames[frameIdx]

  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-heading text-sm text-soft-white">NEOWISE Infrared Blink (2010–2018)</p>
          <p className="mt-0.5 font-body text-xs text-lavender/60">
            7 epochs from the unWISE archive. Always available, independent of SPHEREx.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
          {([1, 2] as const).map((b) => (
            <button
              key={b}
              onClick={() => switchBand(b)}
              className={`rounded-lg px-3 py-1 font-heading text-xs transition-colors ${
                band === b ? 'bg-cyan/20 text-cyan' : 'text-lavender/60 hover:text-soft-white'
              }`}
            >
              W{b} {b === 1 ? '3.4 µm' : '4.6 µm'}
            </button>
          ))}
        </div>
      </div>

      {!blink && (
        <RoundedButton
          className="mt-3"
          variant="secondary"
          disabled={busy}
          onClick={() => load(band)}
        >
          <Radio className="h-4 w-4" />
          {busy ? 'Loading NEOWISE frames…' : 'Load NEOWISE blink'}
        </RoundedButton>
      )}

      {err && <p className="mt-3 font-body text-sm text-amber-300/90">{err}</p>}

      {blink && (
        <div className="mt-4">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black" style={{ aspectRatio: '1' }}>
            {currentFrame && !imgFailed ? (
              <img
                key={currentFrame.frame_url}
                src={currentFrame.frame_url}
                alt={`NEOWISE ${currentFrame.date_label}`}
                className="h-full w-full object-contain"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex h-full items-center justify-center font-body text-sm text-lavender/50">
                {imgFailed ? 'Frame unavailable' : 'Loading…'}
              </div>
            )}
            {currentFrame && (
              <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2.5 py-1 font-heading text-xs text-soft-white backdrop-blur-md">
                {currentFrame.date_label} · {currentFrame.wavelength_um} µm
              </div>
            )}
            <div className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 font-heading text-[10px] text-lavender/70 backdrop-blur-md">
              {frameIdx + 1} / {blink.frames.length}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 text-lavender transition-colors hover:bg-white/10 hover:text-soft-white"
              aria-label={playing ? 'Pause blink' : 'Play blink'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="flex flex-1 gap-1">
              {blink.frames.map((f, i) => (
                <button
                  key={f.version}
                  onClick={() => { setFrameIdx(i); setPlaying(false) }}
                  className={`h-6 flex-1 rounded transition-colors font-heading text-[9px] ${
                    i === frameIdx
                      ? 'bg-cyan/30 text-cyan'
                      : 'bg-white/5 text-lavender/50 hover:bg-white/10 hover:text-soft-white'
                  }`}
                  title={f.date_label}
                >
                  {f.date_label.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-2 font-body text-[11px] text-lavender/50">{blink.note}</p>
        </div>
      )}
    </div>
  )
}
