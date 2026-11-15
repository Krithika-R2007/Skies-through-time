import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Grid3x3 } from 'lucide-react'
import { startBackendMonitor, useBackendStore } from '../../store/backendStore'
import { useFilterStore } from '../../store/filterStore'

// Shows whether the live NASA data service is reachable. When it is not, every page falls
// back to demonstration data on its own, so this is informational. On the map it also
// holds the survey-tile layer toggle.
export function BackendStatus() {
  const status = useBackendStore((s) => s.status)
  const showCoverage = useFilterStore((s) => s.showCoverage)
  const toggleCoverage = useFilterStore((s) => s.toggleCoverage)
  const fullscreen = useFilterStore((s) => s.fullscreen)
  const { pathname } = useLocation()
  useEffect(() => startBackendMonitor(), [])
  if (fullscreen) return null

  return (
    <div className="fixed bottom-5 left-20 z-40 flex items-center gap-2">
      {pathname === '/' && status === 'online' && (
        <button
          onClick={toggleCoverage}
          aria-pressed={showCoverage}
          title="Show the survey grid from the HEALPix coverage service"
          className={`flex items-center gap-2 rounded-full border px-3.5 py-2 font-heading text-xs tracking-wide backdrop-blur-md transition-colors ${
            showCoverage ? 'border-cyan/50 bg-cyan/15 text-cyan' : 'border-white/15 bg-black/50 text-lavender hover:text-soft-white'
          }`}
        >
          <Grid3x3 className="h-3.5 w-3.5" /> Survey grid
        </button>
      )}
    </div>
  )
}
