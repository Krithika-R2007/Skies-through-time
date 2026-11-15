import type { SpectralBand } from '../../data/models'
import { cn } from '../../utils/cn'

// Compact spectral-band selector. The prototype exposes two demonstration bands; the
// component shape is designed to scale to SPHEREx's full 102 near-infrared channels.
export function SpectralBandSelector({
  bands,
  selectedBandId,
  onSelect,
}: {
  bands: SpectralBand[]
  selectedBandId: string
  onSelect: (id: string) => void
}) {
  const selected = bands.find((b) => b.id === selectedBandId) ?? bands[0]

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-[10px] uppercase tracking-[0.2em] text-lavender/45">Band</span>
        {bands.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            className={cn(
              'rounded-xl border border-transparent px-3.5 py-1.5 font-heading text-sm tracking-wide transition-all duration-300',
              b.id === selectedBandId
                ? 'border border-neon/50 bg-neon/15 text-neon'
                : 'border border-white/10 text-lavender/65 hover:border-neon/40 hover:text-neon',
            )}
          >
            {b.label}
          </button>
        ))}
      </div>
      {selected && (
        <p className="mt-2 font-body text-[13px] leading-relaxed text-lavender/60">{selected.description}</p>
      )}
    </div>
  )
}
