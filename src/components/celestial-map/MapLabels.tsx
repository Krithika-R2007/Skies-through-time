import { useMapStore } from '../../store/mapStore'

export function MapLabels() {
  const labels = useMapStore((s) => s.labels)
  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {labels.map((l) => (
        <div
          key={l.id}
          className="absolute -translate-x-1/2 -translate-y-[140%]"
          style={{ left: `${l.leftPct}%`, top: `${l.topPct}%` }}
        >
          <span className="whitespace-nowrap rounded-md bg-black/30 px-1.5 py-0.5 font-heading text-[11px] tracking-wide text-lavender/90 backdrop-blur-sm">
            {l.name}
          </span>
        </div>
      ))}
    </div>
  )
}
