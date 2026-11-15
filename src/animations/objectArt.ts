import type { ObjectType } from '../data/models'

// Artwork for the object explorer. `alpha` images are the supplied cut-outs with a
// transparent background. `screen` images are NASA/ESA/ESO photos on black, composited
// with a screen blend plus a soft edge mask so the black disappears into the sky.
// Objects without an entry keep the CSS-drawn body.

export type ArtMotion = 'star' | 'planet' | 'galaxy' | 'brownDwarf' | 'nebula' | 'comet' | 'rock'
export type ArtMask = 'none' | 'round' | 'soft'

export interface ObjectArt {
  src: string
  kind: 'alpha' | 'screen'
  motion: ArtMotion
  /** Glow colour behind the image. */
  glow: string
  mask?: ArtMask
  credit?: string
}

const base = import.meta.env?.BASE_URL ?? './'
const f = (name: string) => `${base}objects/${name}`

const NASA = 'NASA / ESA / ESO (public image)'

export const OBJECT_ART: Record<string, ObjectArt> = {
  // Supplied cut-outs
  andromeda: { src: f('andromeda.png'), kind: 'alpha', motion: 'galaxy', glow: '#b08cff' },
  '3c278': { src: f('3c278.png'), kind: 'screen', motion: 'galaxy', glow: '#ff9a4a', mask: 'soft' },
  barnards: { src: f('barnards.png'), kind: 'alpha', motion: 'star', glow: '#ff9a6a' },
  epsilon: { src: f('epsilon.png'), kind: 'alpha', motion: 'planet', glow: '#ff9a6a' },
  luhman16: { src: f('luhman16.png'), kind: 'alpha', motion: 'brownDwarf', glow: '#ff8a5a' },
  epsindib: { src: f('epsindib.png'), kind: 'alpha', motion: 'brownDwarf', glow: '#ff3b2a' },
  wise0855: { src: f('wise0855.png'), kind: 'alpha', motion: 'brownDwarf', glow: '#7aa8ff' },
  mira: { src: f('mira.png'), kind: 'alpha', motion: 'nebula', glow: '#c06cff' },
  rigel: { src: f('orion.png'), kind: 'alpha', motion: 'star', glow: '#5aa8ff' },
  proxima: { src: f('proxima.png'), kind: 'alpha', motion: 'star', glow: '#ff7a4a' },
  sirius: { src: f('sirius.png'), kind: 'alpha', motion: 'star', glow: '#9fc7ff' },
  vega: { src: f('vega.png'), kind: 'alpha', motion: 'star', glow: '#bcd8ff' },

  // Added to fill out the map
  sun: { src: f('sun.jpg'), kind: 'screen', motion: 'planet', glow: '#ffd070', mask: 'round', credit: 'NASA / SDO' },
  earth: { src: f('earth.jpg'), kind: 'screen', motion: 'planet', glow: '#6fa8ff', mask: 'round', credit: 'NASA' },
  etacarinae: { src: f('etacarinae.jpg'), kind: 'screen', motion: 'nebula', glow: '#ff9a6a', mask: 'soft', credit: 'NASA / ESA / Hubble' },
  tempel1: { src: f('tempel1.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'NASA' },
  wild2: { src: f('wild2.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'NASA' },
  ison: { src: f('ison.jpg'), kind: 'screen', motion: 'comet', glow: '#8ff0ff', mask: 'soft', credit: 'NASA' },
  borisov: { src: f('borisov.jpg'), kind: 'screen', motion: 'comet', glow: '#6fa8ff', mask: 'soft', credit: 'NASA / ESA / Hubble' },
  ida: { src: f('ida.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'NASA' },
  gaspra: { src: f('gaspra.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'NASA' },
  lutetia: { src: f('lutetia.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'ESA / Rosetta' },
  psyche: { src: f('psyche.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'ESO' },
  arrokoth: { src: f('arrokoth.jpg'), kind: 'screen', motion: 'rock', glow: '#d98a5a', mask: 'soft', credit: 'NASA / New Horizons' },
  ryugu: { src: f('ryugu.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'JAXA' },
  m87: { src: f('m87.jpg'), kind: 'screen', motion: 'galaxy', glow: '#ffd9a0', mask: 'soft', credit: 'NASA / ESA / Hubble' },
  cartwheel: { src: f('cartwheel.jpg'), kind: 'screen', motion: 'galaxy', glow: '#9f7bff', mask: 'soft', credit: 'NASA / ESA / JWST' },
  antennae: { src: f('antennae.jpg'), kind: 'screen', motion: 'galaxy', glow: '#ff9ad0', mask: 'soft', credit: 'NASA / ESA / Hubble' },
  m82: { src: f('m82.jpg'), kind: 'screen', motion: 'galaxy', glow: '#ff7a5a', mask: 'soft', credit: 'NASA / ESA / Hubble' },
  blackeye: { src: f('blackeye.jpg'), kind: 'screen', motion: 'galaxy', glow: '#ffd9a0', mask: 'soft', credit: 'NASA / ESA / Hubble' },
  // Planets
  jupiter: { src: f('jupiter.jpg'), kind: 'screen', motion: 'planet', glow: '#e0b080', mask: 'round', credit: NASA },
  saturn: { src: f('saturn.jpg'), kind: 'screen', motion: 'planet', glow: '#e8d29a', mask: 'soft', credit: NASA },
  mars: { src: f('mars.jpg'), kind: 'screen', motion: 'planet', glow: '#d9774a', mask: 'round', credit: NASA },
  venus: { src: f('venus.jpg'), kind: 'screen', motion: 'planet', glow: '#f3e2b0', mask: 'round', credit: NASA },
  mercury: { src: f('mercury.jpg'), kind: 'screen', motion: 'planet', glow: '#b9b2a8', mask: 'round', credit: NASA },
  uranus: { src: f('uranus.jpg'), kind: 'screen', motion: 'planet', glow: '#9fe8ee', mask: 'round', credit: NASA },
  neptune: { src: f('neptune.jpg'), kind: 'screen', motion: 'planet', glow: '#5a8aff', mask: 'round', credit: NASA },
  // Dwarf planets
  pluto: { src: f('pluto.jpg'), kind: 'screen', motion: 'planet', glow: '#e8d8c0', mask: 'round', credit: NASA },
  ceres: { src: f('ceres.jpg'), kind: 'screen', motion: 'planet', glow: '#b9b2a8', mask: 'round', credit: NASA },
  eris: { src: f('eris.png'), kind: 'alpha', motion: 'planet', glow: '#bcd0e0' },
  haumea: { src: f('haumea.jpg'), kind: 'screen', motion: 'planet', glow: '#e08a7a', mask: 'soft' },
  lmc: { src: f('lmc.jpg'), kind: 'screen', motion: 'nebula', glow: '#ffb070', mask: 'soft' },
  makemake: { src: f('makemake.jpg'), kind: 'screen', motion: 'planet', glow: '#d9774a', mask: 'round', credit: NASA },
  // Comets
  halley: { src: f('halley.jpg'), kind: 'screen', motion: 'comet', glow: '#8ff0ff', mask: 'soft', credit: NASA },
  halebopp: { src: f('halebopp.jpg'), kind: 'screen', motion: 'comet', glow: '#8ff0ff', mask: 'soft', credit: NASA },
  neowise: { src: f('neowise.jpg'), kind: 'screen', motion: 'comet', glow: '#8ff0ff', mask: 'soft', credit: NASA },
  '67p': { src: f('67p.jpg'), kind: 'screen', motion: 'rock', glow: '#a0a0a0', mask: 'soft', credit: 'ESA / Rosetta' },
  // Asteroids
  vesta: { src: f('vesta.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: NASA },
  pallas: { src: f('pallas.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'ESO' },
  hygiea: { src: f('hygiea.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'ESO' },
  eros: { src: f('eros.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: NASA },
  itokawa: { src: f('itokawa.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'soft', credit: 'ESO' },
  bennu: { src: f('bennu.jpg'), kind: 'screen', motion: 'rock', glow: '#b9b2a8', mask: 'round', credit: NASA },
  toutatis: { src: f('toutatis.jpg'), kind: 'screen', motion: 'rock', glow: '#d9b090', mask: 'soft', credit: NASA },
  // Galaxies
  triangulum: { src: f('triangulum.jpg'), kind: 'screen', motion: 'galaxy', glow: '#9f7bff', mask: 'soft', credit: 'ESO / VST' },
  whirlpool: { src: f('whirlpool.jpg'), kind: 'screen', motion: 'galaxy', glow: '#9f7bff', mask: 'soft', credit: NASA },
  sombrero: { src: f('sombrero.jpg'), kind: 'screen', motion: 'galaxy', glow: '#ffd9a0', mask: 'soft', credit: NASA },
  pinwheel: { src: f('pinwheel.jpg'), kind: 'screen', motion: 'galaxy', glow: '#5ad9e6', mask: 'soft', credit: NASA },
  centaurusa: { src: f('centaurusa.jpg'), kind: 'screen', motion: 'galaxy', glow: '#ff9a4a', mask: 'soft', credit: 'ESO' },
  ngc1300: { src: f('ngc1300.jpg'), kind: 'screen', motion: 'galaxy', glow: '#9f7bff', mask: 'soft', credit: NASA },
  ngc7331: { src: f('ngc7331.jpg'), kind: 'screen', motion: 'galaxy', glow: '#9f7bff', mask: 'soft', credit: NASA },
  smc: { src: f('smc.jpg'), kind: 'screen', motion: 'galaxy', glow: '#9f7bff', mask: 'soft', credit: 'ESO' },
}

/** Art for an object. Resolved coordinates from search never match, so they get CSS art. */
export function artFor(id: string, _type?: ObjectType): ObjectArt | undefined {
  return OBJECT_ART[id]
}

/** Longest side, in map units, of an object's picture on the sky map. Kept small so the
 *  whole map reads at a glance; zooming in makes everything larger. */
const MAP_SIZE: Record<ObjectType, number> = {
  star: 30,
  planet: 30,
  dwarfPlanet: 22,
  comet: 36,
  asteroid: 22,
  brownDwarf: 26,
  galaxy: 56,
}
const MAP_SIZE_OVERRIDE: Record<string, number> = { sun: 46, milkyway: 76, etacarinae: 36 }
export const mapSizeFor = (type: ObjectType, id?: string) => (id && MAP_SIZE_OVERRIDE[id]) || MAP_SIZE[type]