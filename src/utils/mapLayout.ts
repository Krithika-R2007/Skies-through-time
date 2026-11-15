import { projectToPlane } from './coordinates'
import type { PlanePosition } from './coordinates'

// The map is organised by what things are and how far away they are, so neighbours on
// screen are neighbours in space:
//  - Solar System (left): an orrery. The Sun sits at the centre and each body's distance
//    from it grows outwards, with the Kuiper Belt and comets beyond the planets.
//  - Nearby stars (middle): distance from the Sun on a log scale.
//  - Galaxies (right): distance from the Milky Way on a log scale.
// Angles are spread with the golden angle so objects at similar distances never stack.

export interface Zone {
  id: 'solar' | 'stars' | 'galaxies'
  title: string
  subtitle: string
  centre: PlanePosition
  /** Radius of the outer edge, for the zone title placement. */
  extent: number
}

export const ZONES: Zone[] = [
  { id: 'solar', title: 'Solar System', subtitle: 'Distance from the Sun', centre: { x: -720, y: 0 }, extent: 520 },
  { id: 'stars', title: 'Nearby Stars', subtitle: 'Distance from the Sun, log scale', centre: { x: 80, y: 0 }, extent: 380 },
  { id: 'galaxies', title: 'Galaxies', subtitle: 'Distance from the Milky Way, log scale', centre: { x: 820, y: 0 }, extent: 380 },
]
const zone = (id: Zone['id']) => ZONES.find((z) => z.id === id)!

/** Orbit radii (map units) of the eight planets, drawn as faint rings. */
const SOLAR_SCALE = 0.95
export const PLANET_ORBITS = [70, 110, 150, 190, 305, 345, 385, 420].map((r) => r * SOLAR_SCALE)

// Solar System: map-unit distance from the Sun.
const SOLAR_RADIUS: Record<string, number> = {
  sun: 0,
  mercury: 70, venus: 110, earth: 150, mars: 190, jupiter: 305, saturn: 345, uranus: 385, neptune: 420,
  // near-Earth asteroids sit among the inner planets
  bennu: 140, itokawa: 163, eros: 172, ryugu: 180, toutatis: 207,
  // main belt, between Mars and Jupiter
  gaspra: 215, ceres: 225, ida: 222, psyche: 230, vesta: 238, lutetia: 245, pallas: 250, hygiea: 265,
  // comets on their long orbits
  tempel1: 275, encke: 280, '67p': 300, wild2: 320, halley: 330, neowise: 360, halebopp: 400, ison: 440, borisov: 485,
  // Kuiper Belt and beyond
  pluto: 450, haumea: 465, arrokoth: 470, makemake: 480, eris: 495,
}

// Nearby stars and brown dwarfs: light years from the Sun.
const STAR_LY: Record<string, number> = {
  proxima: 4.25, barnards: 5.96, luhman16: 6.5, wise0855: 7.4, sirius: 8.6, epsilon: 10.5, epsindib: 11.9, gliese229b: 19,
  vega: 25, arcturus: 36.7, capella: 43, aldebaran: 65, kelu1: 61, algol: 90, mira: 300, polaris: 433,
  teide1: 400, betelgeuse: 550, antares: 554, rigel: 860, etacarinae: 7500,
}

// Galaxies: millions of light years from the Milky Way.
const GALAXY_MLY: Record<string, number> = {
  lmc: 0.163, smc: 0.2, andromeda: 2.5, triangulum: 2.7, m82: 12, centaurusa: 13, blackeye: 17,
  pinwheel: 21, whirlpool: 23, sombrero: 29, antennae: 45, ngc7331: 45, m87: 53.5, '3c278': 60, ngc1300: 61, cartwheel: 500,
}

const GOLDEN = (137.50776 * Math.PI) / 180

function polar(z: Zone, radius: number, order: number): PlanePosition {
  const a = order * GOLDEN + 0.6
  return { x: z.centre.x + Math.cos(a) * radius, y: z.centre.y + Math.sin(a) * radius * 0.92 }
}

const placed = new Map<string, PlanePosition>()
function build() {
  const ranked = <T extends Record<string, number>>(t: T) => Object.entries(t).sort((a, b) => a[1] - b[1])
  ranked(SOLAR_RADIUS).forEach(([id, r], i) => placed.set(id, polar(zone('solar'), r * SOLAR_SCALE, i)))
  ranked(STAR_LY).forEach(([id, ly], i) => placed.set(id, polar(zone('stars'), 60 + 80 * Math.log10(ly), i)))
  ranked(GALAXY_MLY).forEach(([id, mly], i) => placed.set(id, polar(zone('galaxies'), 60 + 75 * Math.log10(10 * mly), i)))
}
build()
placed.set('sun', { ...zone('solar').centre })

/** Where an object sits on the map. Anything unplaced falls back to its sky position. */
export function layoutPosition(id: string, ra: number, dec: number): PlanePosition {
  return placed.get(id) ?? projectToPlane(ra, dec)
}
