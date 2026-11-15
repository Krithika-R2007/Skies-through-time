import { useEffect } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { useFilterStore } from '../../store/filterStore'

// Circular fullscreen button, bottom-right on every page. On the map it also hides the
// search, sidebar and other chrome for pure immersion.
export function FullscreenControl() {
  const fullscreen = useFilterStore((s) => s.fullscreen)
  const toggleFullscreen = useFilterStore((s) => s.toggleFullscreen)

  // If the user leaves browser fullscreen with Esc, bring the chrome back too.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) useFilterStore.setState({ fullscreen: false })
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = () => {
    toggleFullscreen()
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {})
      } else {
        document.exitFullscreen?.().catch(() => {})
      }
    } catch {
      /* the store flag still hides chrome */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/50 text-lavender backdrop-blur-md transition-all hover:border-cyan/40 hover:text-soft-white hover:shadow-[0_0_22px_rgba(90,217,230,0.3)]"
    >
      {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
    </button>
  )
}
