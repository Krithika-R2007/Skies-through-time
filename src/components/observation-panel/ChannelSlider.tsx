import { useEffect, useMemo, useState } from 'react'
import type { Observation } from '../../data/models'
import { getChannelMetadata } from '../../data/api/endpoints'
import { useAsync } from '../../hooks/useAsync'

// SPHEREx records 102 infrared channels (0.75 to 5 micrometres) of the same field. The
// slider picks one; `null` means the full-band cutout. Wavelengths come from the
// backend's channel table, with a linear estimate until it arrives.
export const CHANNEL_COUNT = 102

export function estimateWavelength(channel: number): number {
  return 0.75 + (channel / (CHANNEL_COUNT - 1)) * (5 - 0.75)
}

export function useChannelWavelengths(obs: Observation | undefined): (channel: number) => { um: number; exact: boolean } {
  const url = obs?.live?.renderUrl ?? ''
  const meta = useAsync((signal) => getChannelMetadata(url, { signal }), url, !!url)
  const table = useMemo(() => {
    const m = new Map<number, number>()
    meta.data?.forEach((c) => m.set(c.channel, c.wavelength_um))
    return m
  }, [meta.data])
  return (channel) => {
    const w = table.get(channel)
    return w !== undefined ? { um: w, exact: true } : { um: estimateWavelength(channel), exact: false }
  }
}

export function ChannelSlider({
  channel,
  onChange,
  wavelengthOf,
}: {
  channel: number | null
  onChange: (c: number | null) => void
  wavelengthOf: (c: number) => { um: number; exact: boolean }
}) {
  // Local value moves instantly; the (expensive) image request follows once dragging settles.
  const [local, setLocal] = useState<number>(channel ?? 0)
  useEffect(() => {
    if (channel !== null) setLocal(channel)
  }, [channel])
  useEffect(() => {
    if (channel === null || local === channel) return
    const t = window.setTimeout(() => onChange(local), 280)
    return () => window.clearTimeout(t)
  }, [local, channel, onChange])

  const w = wavelengthOf(local)
  const active = channel !== null
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-[10px] uppercase tracking-[0.2em] text-lavender/45">Infrared channel</span>
        <button
          onClick={() => onChange(null)}
          className={`rounded-xl border px-3 py-1 font-heading text-xs tracking-wide transition-colors ${
            !active ? 'border-neon/50 bg-neon/15 text-neon' : 'border-white/10 text-lavender/65 hover:border-neon/40 hover:text-neon'
          }`}
        >
          Full band
        </button>
        <span className="ml-auto font-heading text-sm text-soft-white">
          {active ? (
            <>
              {w.exact ? '' : '\u2248 '}
              {w.um.toFixed(2)} {'\u00b5'}m
              <span className="ml-2 text-xs text-lavender/50">ch {local}</span>
            </>
          ) : (
            <span className="text-lavender/50">0.75 {'\u2013'} 5.0 {'\u00b5'}m</span>
          )}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={CHANNEL_COUNT - 1}
        value={local}
        aria-label="Infrared channel"
        onChange={(e) => {
          const v = Number(e.target.value)
          setLocal(v)
          if (channel === null) onChange(v)
        }}
        className="mt-2 h-1.5 w-full cursor-pointer accent-[#ffb02e]"
      />
      <div className="mt-1 flex justify-between font-body text-[10px] text-lavender/40">
        <span>0.75 {'\u00b5'}m near-IR</span>
        <span>5.0 {'\u00b5'}m mid-IR</span>
      </div>
      <p className="mt-2 font-body text-[13px] leading-relaxed text-lavender/60">
        SPHEREx sees the same patch of sky through 102 infrared {'\u201c'}filters{'\u201d'}. Drag to see which features glow at which wavelength.
      </p>
    </div>
  )
}
