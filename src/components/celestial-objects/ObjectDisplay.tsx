import type { FC } from 'react'
import { motion } from 'framer-motion'
import type { CelestialObject, ObjectType } from '../../data/models'
import { objectTintHex } from '../../animations/objectAnimations'
import { artFor } from '../../animations/objectArt'
import type { ObjectArt, ArtMotion } from '../../animations/objectArt'

// Large, prominent per-classification object animation for the explorer page. Built
// with CSS/Framer Motion (no WebGL) so object pages stay light — only the map loads
// Three.js. Animations are configurable per classification; reduced motion is honoured
// globally via <MotionConfig reducedMotion="user"> in the app shell.

const StarBody: FC<{ tint: string }> = ({ tint }) => (
  <div className="relative flex h-64 w-64 items-center justify-center">
    <div
      className="absolute h-64 w-64 rounded-full opacity-50 blur-2xl"
      style={{ background: `radial-gradient(circle, ${tint}, transparent 70%)` }}
    />
    <motion.div
      className="h-28 w-28 rounded-full"
      style={{ background: `radial-gradient(circle at 40% 40%, #ffffff, ${tint} 55%, transparent 75%)` }}
      animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
)

const GlowBody: FC<{ tint: string; size: number }> = ({ tint, size }) => (
  <div className="relative flex items-center justify-center" style={{ height: size, width: size }}>
    <div
      className="absolute rounded-full opacity-50 blur-2xl"
      style={{ height: size, width: size, background: `radial-gradient(circle, ${tint}, transparent 70%)` }}
    />
    <motion.div
      className="rounded-full"
      style={{ height: size * 0.45, width: size * 0.45, background: `radial-gradient(circle at 40% 35%, #fff6e8, ${tint} 55%, transparent 78%)` }}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
)

const PlanetBody: FC<{ tint: string }> = ({ tint }) => (
  <motion.div
    className="relative h-40 w-40 rounded-full"
    style={{ background: `radial-gradient(circle at 32% 30%, #ffffff, ${tint} 45%, #1a1030 95%)` }}
    animate={{ rotate: 360 }}
    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
  >
    <div className="absolute inset-0 rounded-full opacity-40 mix-blend-overlay" style={{ background: 'radial-gradient(circle at 70% 75%, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
  </motion.div>
)

const CometBody: FC<{ tint: string }> = ({ tint }) => (
  <motion.div className="relative flex items-center" animate={{ x: [-40, 40, -40], y: [-6, 6, -6] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}>
    <div className="h-3 w-44 rounded-full" style={{ background: `linear-gradient(to left, ${tint}, transparent)` }} />
    <motion.div className="-ml-2 h-20 w-20 rounded-full" style={{ background: `radial-gradient(circle at 45% 40%, #ffffff, ${tint} 50%, transparent 72%)` }} animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
  </motion.div>
)

const AsteroidBody: FC<{ tint: string }> = ({ tint }) => (
  <motion.div className="relative flex items-center" animate={{ x: [-24, 24, -24] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}>
    <div className="h-2.5 w-20 rounded-full" style={{ background: `linear-gradient(to left, ${tint}, transparent)` }} />
    <motion.div className="-ml-1 h-16 w-16" style={{ background: `linear-gradient(135deg, ${tint}, #6b4a32)`, clipPath: 'polygon(20% 5%, 78% 12%, 96% 55%, 82% 92%, 30% 96%, 6% 62%)' }} animate={{ rotate: 360 }} transition={{ duration: 26, repeat: Infinity, ease: 'linear' }} />
  </motion.div>
)

const GalaxyBody: FC<{ tint: string }> = ({ tint }) => (
  <motion.div className="relative flex h-64 w-64 items-center justify-center" animate={{ rotate: 360 }} transition={{ duration: 44, repeat: Infinity, ease: 'linear' }}>
    <div className="h-28 w-64 rounded-full" style={{ background: `radial-gradient(ellipse, #ffffff, ${tint} 32%, transparent 70%)` }} />
    <div className="absolute h-20 w-20 rounded-full opacity-90" style={{ background: `radial-gradient(circle, #ffffff, ${tint} 60%, transparent 75%)` }} />
  </motion.div>
)

// Image-based body: real artwork with a motion style that suits the kind of object.
const MASKS = {
  none: undefined,
  round: 'radial-gradient(circle closest-side, #000 86%, transparent 100%)',
  soft: 'radial-gradient(ellipse closest-side, #000 62%, transparent 100%)',
} as const

const MOTIONS: Record<ArtMotion, { animate: Record<string, number[]>; transition: Record<string, unknown> }> = {
  star: {
    animate: { scale: [1, 1.06, 1], rotate: [-2, 2, -2] },
    transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
  },
  planet: {
    animate: { y: [-7, 7, -7], rotate: [-1.5, 1.5, -1.5] },
    transition: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
  },
  galaxy: {
    animate: { rotate: [-4, 4, -4], scale: [1, 1.04, 1] },
    transition: { duration: 34, repeat: Infinity, ease: 'easeInOut' },
  },
  brownDwarf: {
    animate: { y: [-5, 5, -5], scale: [1, 1.03, 1] },
    transition: { duration: 9, repeat: Infinity, ease: 'easeInOut' },
  },
  nebula: {
    animate: { scale: [1, 1.05, 1], rotate: [-3, 3, -3] },
    transition: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
  },
  comet: {
    animate: { x: [-22, 22, -22], y: [-8, 8, -8], rotate: [-2, 2, -2] },
    transition: { duration: 14, repeat: Infinity, ease: 'easeInOut' },
  },
  rock: {
    animate: { rotate: [0, 360] },
    transition: { duration: 90, repeat: Infinity, ease: 'linear' },
  },
}

const ArtBody: FC<{ art: ObjectArt; name: string }> = ({ art, name }) => {
  const m = MOTIONS[art.motion]
  const mask = MASKS[art.mask ?? 'none']
  return (
    <div className="relative flex w-[min(100%,21rem)] flex-col items-center justify-center">
      <motion.div
        className="absolute inset-[8%] rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${art.glow}, transparent 70%)` }}
        animate={{ opacity: [0.28, 0.5, 0.28] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.img
        src={art.src}
        alt={name}
        draggable={false}
        className="relative block h-auto w-full select-none"
        style={{
          mixBlendMode: art.kind === 'screen' ? 'screen' : undefined,
          WebkitMaskImage: mask,
          maskImage: mask,
          filter: `drop-shadow(0 0 22px ${art.glow}66)`,
        }}
        animate={m.animate}
        transition={m.transition}
      />
      {art.credit && (
        <span className="mt-2 font-body text-[10px] uppercase tracking-wider text-lavender/35">Image: {art.credit}</span>
      )}
    </div>
  )
}
const RENDERERS: Record<ObjectType, FC<{ tint: string }>> = {
  star: StarBody,
  brownDwarf: ({ tint }) => <GlowBody tint={tint} size={256} />,
  planet: PlanetBody,
  dwarfPlanet: ({ tint }) => <GlowBody tint={tint} size={176} />,
  comet: CometBody,
  asteroid: AsteroidBody,
  galaxy: GalaxyBody,
}

export function ObjectDisplay({ object }: { object: CelestialObject }) {
  const tint = objectTintHex(object.objectType, object.id)
  const Renderer = RENDERERS[object.objectType]
  const art = artFor(object.id, object.objectType)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="flex items-center justify-center">
      {art ? <ArtBody art={art} name={object.name} /> : <Renderer tint={tint} />}
    </motion.div>
  )
}
