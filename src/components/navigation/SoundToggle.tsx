import { useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useSoundStore } from '../../store/soundStore'
import { playSound } from '../../utils/sound'

// Plays a click for any button press anywhere in the app (one listener, so every page
// and control gets it), and shows the mute toggle beside the fullscreen button.
export function SoundToggle() {
  const muted = useSoundStore((s) => s.muted)
  const toggle = useSoundStore((s) => s.toggle)

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('button, select, [role="button"]')) playSound('click')
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      aria-pressed={!muted}
      className="fixed bottom-5 right-20 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/50 text-lavender backdrop-blur-md transition-all hover:border-cyan/40 hover:text-soft-white hover:shadow-[0_0_22px_rgba(90,217,230,0.3)]"
    >
      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  )
}
