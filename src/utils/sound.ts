import { useSoundStore } from '../store/soundStore'

// Tiny UI sounds synthesized with the Web Audio API, so there are no audio files to
// load or license. Everything is quiet and short. Audio only starts after the user has
// interacted with the page, as browsers require.

export type SoundName = 'click' | 'tick' | 'travel'

let ctx: AudioContext | null = null
let lastTick = 0

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!navigator.userActivation?.hasBeenActive) return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOptions {
  type?: OscillatorType
  from: number
  to?: number
  duration: number
  volume: number
  delay?: number
}

function tone(c: AudioContext, { type = 'sine', from, to, duration, volume, delay = 0 }: ToneOptions): void {
  const start = c.currentTime + delay
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.015, duration / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(c.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playSound(name: SoundName): void {
  if (useSoundStore.getState().muted) return
  const c = getContext()
  if (!c) return

  if (name === 'click') {
    tone(c, { type: 'triangle', from: 1100, to: 700, duration: 0.07, volume: 0.05 })
  } else if (name === 'tick') {
    const now = performance.now()
    if (now - lastTick < 70) return
    lastTick = now
    tone(c, { from: 640, duration: 0.04, volume: 0.02 })
  } else {
    // A soft rising sweep with a quiet fifth above it, for travelling to an object.
    tone(c, { from: 160, to: 640, duration: 1.0, volume: 0.05 })
    tone(c, { from: 240, to: 960, duration: 1.0, volume: 0.02, delay: 0.05 })
  }
}
