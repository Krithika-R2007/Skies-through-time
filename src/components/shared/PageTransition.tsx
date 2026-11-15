import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

// `flat` fades only. Pages that hold a WebGL canvas must not be scaled while they enter:
// the canvas measures its on-screen position once, and a scaled measurement leaves the
// pointer offset from what is drawn, so objects cannot be clicked.
export function PageTransition({ children, flat = false }: { children: ReactNode; flat?: boolean }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: flat ? 1 : 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: flat ? 1 : 1.015 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}