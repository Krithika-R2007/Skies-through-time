import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createObservationDataURL } from '../../utils/proceduralTexture'
import type { ImagePlaceholder } from '../../data/models'
import { cn } from '../../utils/cn'

// Observation "image". With `src` it shows a real SPHEREx cutout from the backend and
// falls back to the stylised demonstration placeholder if the image cannot be loaded.
// Without `src` it is the placeholder, clearly labelled as demonstration.
//  - default: crossfades when the image changes (timeline scrubbing)
//  - instant: swaps immediately, so differences between frames are seen as a sharp change
// `children` render on top of the image (for overlays such as the date badge).
export function ObservationImage({
  placeholder,
  src,
  badge,
  aspect = 'aspect-[16/10]',
  className,
  instant = false,
  children,
}: {
  placeholder: ImagePlaceholder
  src?: string
  /** Override for the bottom-right label (for example a wavelength). */
  badge?: string
  aspect?: string
  className?: string
  instant?: boolean
  children?: ReactNode
}) {
  const dataUrl = useMemo(
    () => createObservationDataURL(placeholder, 1280, 800),
    // Depend on the values, not the object identity, so re-renders never repaint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeholder.seed, placeholder.style, placeholder.hue],
  )
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>(src ? 'loading' : 'ok')
  useEffect(() => {
    setStatus(src ? 'loading' : 'ok')
  }, [src])

  const live = !!src && status !== 'error'
  const shown = live ? src! : dataUrl
  const key = live ? src! : placeholder.seed
  const fit = live ? 'object-contain bg-black' : 'object-cover'
  const alt = live ? 'SPHEREx observation' : 'Observation'

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/50', aspect, className)}>
      {live && status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60" role="status" aria-label="Loading image">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan/20 border-t-cyan" />
        </div>
      )}
      {instant ? (
        <img
          src={shown}
          className={cn('absolute inset-0 h-full w-full', fit)}
          alt={alt}
          onLoad={() => live && setStatus('ok')}
          onError={() => live && setStatus('error')}
        />
      ) : (
        <AnimatePresence>
          <motion.img
            key={key}
            src={shown}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={cn('absolute inset-0 h-full w-full', fit)}
            alt={alt}
            onLoad={() => live && setStatus('ok')}
            onError={() => live && setStatus('error')}
          />
        </AnimatePresence>
      )}
      {children}
      <span
        className={cn(
          'absolute bottom-2.5 right-2.5 rounded-md bg-black/50 px-2 py-0.5 font-heading text-[10px] uppercase tracking-wider backdrop-blur-sm',
          live ? 'text-cyan' : 'text-lavender/70',
        )}
      >
        {badge ?? (live ? 'NASA SPHEREx' : null)}
      </span>
    </div>
  )
}
