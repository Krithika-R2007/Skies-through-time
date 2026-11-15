import * as THREE from 'three'
import type { ImagePlaceholder, ObjectType } from '../data/models'
import { createRng, hashString } from '../data/mock/prng'

type SpriteMap = Record<ObjectType, THREE.Texture>

function makeCanvas(size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  return { canvas, ctx, size }
}

function toTexture(canvas: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  tex.anisotropy = 4
  return tex
}

function glowSprite(): THREE.Texture {
  const { canvas, ctx, size } = makeCanvas()
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.92)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.22)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

function diskSprite(): THREE.Texture {
  const { canvas, ctx, size } = makeCanvas()
  const c = size / 2
  const g = ctx.createRadialGradient(c - size * 0.1, c - size * 0.1, size * 0.04, c, c, c * 0.94)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.96)')
  g.addColorStop(0.88, 'rgba(255,255,255,0.65)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

function cometSprite(): THREE.Texture {
  const { canvas, ctx, size } = makeCanvas()
  const headX = size / 2
  const headY = size * 0.66
  const headR = size * 0.085
  const g = ctx.createLinearGradient(headX, headY, headX, 0)
  g.addColorStop(0, 'rgba(255,255,255,0.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(headX - headR * 1.4, headY)
  ctx.quadraticCurveTo(headX - size * 0.03, headY * 0.45, headX, 2)
  ctx.quadraticCurveTo(headX + size * 0.03, headY * 0.45, headX + headR * 1.4, headY)
  ctx.closePath()
  ctx.fill()
  const hg = ctx.createRadialGradient(headX, headY, 0, headX, headY, headR * 2.8)
  hg.addColorStop(0, 'rgba(255,255,255,1)')
  hg.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  hg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.arc(headX, headY, headR * 2.8, 0, Math.PI * 2)
  ctx.fill()
  return toTexture(canvas)
}

function asteroidSprite(): THREE.Texture {
  const { canvas, ctx, size } = makeCanvas()
  const bx = size * 0.62
  const by = size / 2
  const br = size * 0.07
  const g = ctx.createLinearGradient(0, by, bx, by)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(255,255,255,0.5)')
  ctx.fillStyle = g
  ctx.fillRect(0, by - br * 0.5, bx, br)
  const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br * 2.4)
  bg.addColorStop(0, 'rgba(255,255,255,1)')
  bg.addColorStop(0.5, 'rgba(255,255,255,0.85)')
  bg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(bx, by, br * 2.4, 0, Math.PI * 2)
  ctx.fill()
  return toTexture(canvas)
}

export function createTypeSprites(): SpriteMap {
  return {
    star: glowSprite(),
    planet: diskSprite(),
    dwarfPlanet: diskSprite(),
    comet: cometSprite(),
    asteroid: asteroidSprite(),
    brownDwarf: glowSprite(),
    galaxy: glowSprite(),
  }
}

export function disposeSprites(sprites: SpriteMap): void {
  Object.values(sprites).forEach((t) => t.dispose())
}

// --- Observation image placeholders ---

const PI2 = Math.PI * 2

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}

function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, h: number, a: number): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, hsla(h, 70, 55, a))
  g.addColorStop(1, hsla(h, 70, 55, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, PI2)
  ctx.fill()
}

// Generated images are deterministic, so cache them: switching bands or epochs back and
// forth (or re-rendering a page) never repaints the same canvas twice.
const URL_CACHE = new Map<string, string>()
const URL_CACHE_MAX = 60

export function createObservationDataURL(p: ImagePlaceholder, w = 720, h = 540): string {
  const key = `${p.seed}|${p.style}|${p.hue}|${w}x${h}`
  const hit = URL_CACHE.get(key)
  if (hit) return hit
  const url = renderObservation(p, w, h)
  if (url) {
    if (URL_CACHE.size >= URL_CACHE_MAX) URL_CACHE.delete(URL_CACHE.keys().next().value as string)
    URL_CACHE.set(key, url)
  }
  return url
}

function renderObservation(p: ImagePlaceholder, w: number, h: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const rng = createRng(hashString(p.seed))
  const hue = p.hue

  ctx.fillStyle = `hsl(${hue}, 45%, 5%)`
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'lighter'

  if (p.style === 'surface') {
    ctx.globalCompositeOperation = 'source-over'
    const cx = w / 2
    const cy = h / 2
    const r = Math.min(w, h) * 0.42
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r)
    g.addColorStop(0, hsla(hue, 60, 72, 1))
    g.addColorStop(0.6, hsla(hue, 55, 45, 1))
    g.addColorStop(0.92, hsla(hue, 60, 22, 1))
    g.addColorStop(1, hsla(hue, 60, 10, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, PI2)
    ctx.fill()
    ctx.globalCompositeOperation = 'overlay'
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = hsla(hue + i * 8, 40, 40, 0.05)
      ctx.fillRect(0, cy - r + i * (r * 0.34), w, r * 0.12)
    }
  } else if (p.style === 'disk') {
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.scale(1, 0.45)
    blob(ctx, 0, 0, Math.min(w, h) * 0.5, hue + 20, 0.5)
    ctx.restore()
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.scale(0.42, 0.42)
    blob(ctx, 0, 0, Math.min(w, h) * 0.5, hue, 0.95)
    ctx.restore()
    for (let i = 0; i < 40; i++) {
      const ang = rng() * PI2
      const rad = rng() * Math.min(w, h) * 0.45
      ctx.fillStyle = hsla(hue + (rng() * 40 - 20), 60, 75, 0.25)
      ctx.beginPath()
      ctx.arc(w / 2 + Math.cos(ang) * rad, h / 2 + Math.sin(ang) * rad * 0.45, rng() * 2 + 0.4, 0, PI2)
      ctx.fill()
    }
  } else if (p.style === 'cluster') {
    blob(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, hue, 0.5)
    for (let i = 0; i < 130; i++) {
      ctx.fillStyle = hsla(hue + (rng() * 50 - 25), 60, 80, 0.8)
      ctx.beginPath()
      ctx.arc(rng() * w, rng() * h, rng() * 1.6 + 0.3, 0, PI2)
      ctx.fill()
    }
  } else if (p.style === 'field') {
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = hsla(hue + (rng() * 30), 50, 72, 0.6)
      ctx.beginPath()
      ctx.arc(rng() * w, rng() * h, rng() * 1.2 + 0.2, 0, PI2)
      ctx.fill()
    }
  } else {
    const n = 6 + Math.floor(rng() * 4)
    for (let i = 0; i < n; i++) {
      const x = rng() * w
      const y = rng() * h
      const r = Math.min(w, h) * (0.2 + rng() * 0.4)
      blob(ctx, x, y, r, hue + (rng() * 60 - 30), 0.4)
    }
  }

  ctx.globalCompositeOperation = 'source-over'
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.62)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)

  return canvas.toDataURL()
}
