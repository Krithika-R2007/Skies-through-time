import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface CosmicBackgroundProps {
  density?: number
  /** Softens the small stars (slight blur + lower opacity) so foreground content leads. */
  dimmed?: boolean
}

interface Star {
  x: number
  y: number
  r: number
  baseA: number
  twPhase: number
  twSpeed: number
  vx: number
  vy: number
  color: string
}

const STAR_COLORS = ['#ffffff', '#c9b6e8', '#9fc7ff', '#ffd9b0', '#ffb0d8']

export function CosmicBackground({ density = 1, dimmed = false }: CosmicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let stars: Star[] = []
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    function seed() {
      const area = w * h
      const count = Math.max(180, Math.floor((area / 2600) * density))
      stars = new Array(count).fill(0).map((_, i) => {
        const layer = i % 3
        const r =
          layer === 2
            ? Math.random() * 1.6 + 0.8
            : layer === 1
              ? Math.random() * 1.0 + 0.4
              : Math.random() * 0.7 + 0.2
        const drift = layer === 2 ? 0.018 : layer === 1 ? 0.01 : 0.005
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r,
          baseA: layer === 2 ? 0.9 : layer === 1 ? 0.6 : 0.35,
          twPhase: Math.random() * Math.PI * 2,
          twSpeed: 0.5 + Math.random() * 1.5,
          vx: (Math.random() - 0.5) * drift,
          vy: (Math.random() - 0.5) * drift,
          color: STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0],
        }
      })
    }

    function resize() {
      if (!canvas) return
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    let last = performance.now()
    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        if (!reduced) {
          s.x += s.vx * dt * 60
          s.y += s.vy * dt * 60
          if (s.x < -2) s.x = w + 2
          if (s.x > w + 2) s.x = -2
          if (s.y < -2) s.y = h + 2
          if (s.y > h + 2) s.y = -2
        }
        const tw = reduced ? 1 : 0.6 + 0.4 * Math.sin((now / 1000) * s.twSpeed + s.twPhase)
        ctx.globalAlpha = s.baseA * tw
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    resize()
    raf = requestAnimationFrame(frame)
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [reduced, density])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      <div
        className="nebula-1 absolute -left-[15%] top-[8%] h-[60vh] w-[60vh] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(154,58,107,0.5), transparent 70%)' }}
      />
      <div
        className="nebula-2 absolute right-[5%] top-[18%] h-[55vh] w-[55vh] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(60,35,99,0.6), transparent 70%)' }}
      />
      <div
        className="nebula-3 absolute bottom-[6%] left-[28%] h-[50vh] w-[50vh] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(90,217,230,0.3), transparent 70%)' }}
      />
      <div
        className="nebula-4 absolute right-[18%] bottom-[14%] h-[45vh] w-[45vh] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(232,144,90,0.4), transparent 70%)' }}
      />
      <div
        className="absolute inset-0 transition-[filter,opacity] duration-700 ease-space"
        style={{ filter: dimmed ? 'blur(1.5px)' : 'none', opacity: dimmed ? 0.45 : 1 }}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  )
}
