import { useEffect, useRef } from 'react'
import { useDataProvider } from '../../data/providers/DataContext'
import { useMapStore } from '../../store/mapStore'
import { OBJECT_TYPE_LABELS } from '../../data/models'

// Small card that follows the cursor while hovering an object, so even tiny markers at
// wide zoom can be identified without cluttering the map with permanent labels.
export function MapHoverCard() {
  const hoverId = useMapStore((s) => s.hoverObjectId)
  const provider = useDataProvider()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])

  const obj = hoverId ? provider.getObjectById(hoverId) : undefined
  const count = obj ? provider.getObservations(obj.id).length : 0

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed left-0 top-0 z-40 transition-opacity duration-150 ${obj ? 'opacity-100' : 'opacity-0'}`}
      style={{ transform: 'translate(-999px, -999px)', willChange: 'transform' }}
    >
      {obj && (
        <div className="rounded-xl border border-white/10 bg-black/70 px-3.5 py-2.5 backdrop-blur-md">
          <p className="font-heading text-base text-soft-white">{obj.name}</p>
          <p className="mt-0.5 font-body text-sm text-lavender/70">
            {OBJECT_TYPE_LABELS[obj.objectType].replace(/s$/, '')}
            <span className="mx-1.5 text-lavender/30">·</span>
            {count === 0 ? 'No observations' : `${count} observation${count === 1 ? '' : 's'}`}
          </p>
        </div>
      )}
    </div>
  )
}
