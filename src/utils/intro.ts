// Opening sequence of the map: every object starts at a random spot, slightly smaller,
// holds there for a moment, then glides to its real place. Plays once per page load.
const HOLD = 1.8
const MOVE = 3.6
export const INTRO_SECONDS = HOLD + MOVE

let t0: number | null = null
const seed = Math.random() * 1000

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** 0 while objects are scattered, easing to 1 when they are home. */
export function introEase(): number {
  if (reduced()) return 1
  const now = performance.now() / 1000
  if (t0 === null) t0 = now
  const t = now - t0
  if (t <= HOLD) return 0
  if (t >= INTRO_SECONDS) return 1
  const u = (t - HOLD) / MOVE
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}

/** 0 until the opening title has gone, then fades to 1 over a little over a second. */
export function afterIntro(): number {
  if (reduced()) return 1
  const now = performance.now() / 1000
  if (t0 === null) t0 = now
  return Math.min(1, Math.max(0, (now - t0 - INTRO_SECONDS) / 1.2))
}

function rand(id: string, salt: number): number {
  let h = 2166136261 ^ Math.floor(seed * 7919 + salt * 104729)
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  h ^= h >>> 15
  h = Math.imul(h, 2246822519)
  h ^= h >>> 13
  return ((h >>> 0) % 100000) / 100000
}

/** Random starting spot for an object, spread over the whole map. */
export function scatterOf(id: string): { x: number; y: number } {
  return { x: (rand(id, 1) - 0.5) * 2200, y: (rand(id, 2) - 0.5) * 1100 }
}

export const INTRO_START_SCALE = 0.6
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t