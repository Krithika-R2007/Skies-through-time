import * as THREE from 'three'
import type { ObjectType } from '../data/models'
import { createRng, hashString } from '../data/mock/prng'

export interface TypeAnimation {
  baseSize: number
  palette: string[]
}

export const TYPE_ANIMATIONS: Record<ObjectType, TypeAnimation> = {
  star: { baseSize: 14, palette: ['#9fc7ff', '#ffffff', '#ffe9c4', '#ffd9a0', '#ffb38a'] },
  planet: { baseSize: 16, palette: ['#7fb4ff', '#8fd0ff', '#c9a0ff', '#7fffc4', '#ff9a7f'] },
  dwarfPlanet: { baseSize: 10, palette: ['#b48cff', '#a9a3ff', '#c98aff'] },
  comet: { baseSize: 20, palette: ['#8ff0ff', '#a8e8ff', '#cfe9ff'] },
  asteroid: { baseSize: 9, palette: ['#c98a5a', '#b07a5a', '#9c7050'] },
  brownDwarf: { baseSize: 12, palette: ['#ff9a6a', '#ff8a5a', '#ff7a4a'] },
  galaxy: { baseSize: 30, palette: ['#d79bff', '#b08cff', '#9f7bff', '#c79bff'] },
}

export interface InstanceMeta {
  phase: number
  speed: number
  dir: number
  baseScale: number
  tint: THREE.Color
}

export function instanceMetaFor(type: ObjectType, id: string, baseSize: number): InstanceMeta {
  const rng = createRng(hashString(id))
  const palette = TYPE_ANIMATIONS[type].palette
  const baseHex = palette[Math.floor(rng() * palette.length) % palette.length]
  const tint = new THREE.Color(baseHex)
  tint.multiplyScalar(0.82 + rng() * 0.28)
  return {
    phase: rng() * Math.PI * 2,
    speed: 0.6 + rng() * 1.2,
    dir: rng() * Math.PI * 2,
    baseScale: baseSize * (0.85 + rng() * 0.3),
    tint,
  }
}

// Three-free tint selector for the object-explorer display (CSS-based, no WebGL) so
// object pages don't pull in the Three.js chunk just to show one object.
export function objectTintHex(type: ObjectType, id: string): string {
  const rng = createRng(hashString(id))
  const palette = TYPE_ANIMATIONS[type].palette
  return palette[Math.floor(rng() * palette.length) % palette.length]
}
