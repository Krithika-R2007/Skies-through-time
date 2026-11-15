import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMapStore } from '../../store/mapStore'
import { INTRO_SECONDS } from '../../utils/intro'

// Title card shown once per session while the camera drifts in, then fades away so the
// map is left completely clear.
export function IntroTitle() {
  const [show, setShow] = useState(() => !useMapStore.getState().introPlayed)

  useEffect(() => {
    if (!show) return
    const t = window.setTimeout(() => setShow(false), INTRO_SECONDS * 1000)
    return () => window.clearTimeout(t)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="font-display text-5xl text-soft-white drop-shadow-[0_0_40px_rgba(90,217,230,0.25)] sm:text-7xl lg:text-8xl">
            Skies Through Time
          </h1>
          <p className="mt-5 font-heading text-sm uppercase tracking-[0.4em] text-lavender/70 sm:text-base">
            Drag to explore &middot; Scroll to zoom
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
