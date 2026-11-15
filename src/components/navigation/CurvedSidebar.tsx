import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Logo } from './Logo'
import { TypeFilters } from './TypeFilters'
import { useFilterStore } from '../../store/filterStore'

// Distinctive collapsible panel with a concave (inward-curving) right edge. Closed by
// default so the map stays the main attraction.
export function CurvedSidebar() {
  const [open, setOpen] = useState(false)
  const fullscreen = useFilterStore((s) => s.fullscreen)

  if (fullscreen) return null

  return (
    <motion.aside
      className="absolute left-0 top-0 z-30 h-full"
      initial={false}
      animate={{ width: open ? 256 : 68 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="sidebar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(8,24,36,0.96)" />
            <stop offset="100%" stopColor="rgba(10,14,30,0.96)" />
          </linearGradient>
        </defs>
        {/* Outward (convex) edge: narrow at top and bottom, bulging at the middle */}
        <path d="M0,0 L86,0 Q114,50 86,100 L0,100 Z" fill="url(#sidebar-fill)" />
        <path d="M86,0 Q114,50 86,100" fill="none" stroke="rgba(90,217,230,0.18)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="relative flex h-full flex-col py-2">
        <Logo expanded={open} />
        {/* Right padding keeps content inside the narrow top/bottom of the curved edge */}
        <div className="mt-2 flex-1 overflow-y-auto overflow-x-hidden pr-[14%]">
          <TypeFilters expanded={open} />
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse panel' : 'Expand panel'}
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-midnight-700/95 text-lavender backdrop-blur-md transition-colors hover:text-soft-white hover:shadow-[0_0_18px_rgba(90,217,230,0.3)]"
        >
          {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  )
}
