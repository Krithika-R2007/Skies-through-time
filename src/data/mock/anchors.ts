import type { ObjectType } from '../models'

export interface AnchorSeed {
  id: string
  name: string
  objectType: ObjectType
  rightAscension: number
  declination: number
  description: string
}

// Solar-system bodies move, so they have no fixed place among the stars. They are laid
// out along the ecliptic (the Sun's path, where the planets really travel), evenly spaced
// and interleaved by kind so nothing overlaps. Their positions are illustrative.
const SOLAR_TYPES: ObjectType[] = ['planet', 'dwarfPlanet', 'comet', 'asteroid']

export function eclipticDec(raDeg: number): number {
  const obliquity = (23.44 * Math.PI) / 180
  return (Math.atan(Math.tan(obliquity) * Math.sin((raDeg * Math.PI) / 180)) * 180) / Math.PI
}

function placeOnEcliptic(seeds: AnchorSeed[]): AnchorSeed[] {
  const solar = seeds.filter((s) => SOLAR_TYPES.includes(s.objectType) && s.id !== 'epsilon')
  const byType = SOLAR_TYPES.map((t) => solar.filter((s) => s.objectType === t))
  const order: AnchorSeed[] = []
  for (let i = 0; byType.some((l) => i < l.length); i++) byType.forEach((l) => l[i] && order.push(l[i]))
  const step = 360 / order.length
  const placed = new Map(
    order.map((s, i) => {
      const ra = (i * step + step / 2) % 360
      const wobble = s.objectType === 'comet' ? 10 * Math.sin(i * 2.1) : s.objectType === 'asteroid' ? 4 * Math.cos(i * 1.7) : 0
      return [s.id, { ...s, rightAscension: +ra.toFixed(2), declination: +(eclipticDec(ra) + wobble).toFixed(2) }]
    }),
  )
  return seeds.map((s) => placed.get(s.id) ?? s)
}

const RAW_ANCHORS: AnchorSeed[] = [
  // --- Stars ---
  { id: 'betelgeuse', name: 'Betelgeuse', objectType: 'star', rightAscension: 88.79, declination: 7.41, description: 'A red supergiant nearing the end of its life, one of the largest stars known.' },
  { id: 'sirius', name: 'Sirius', objectType: 'star', rightAscension: 101.25, declination: -16.72, description: 'The brightest star in Earth\u2019s night sky, a binary system led by a blue-white main-sequence star.' },
  { id: 'polaris', name: 'Polaris', objectType: 'star', rightAscension: 37.95, declination: 89.26, description: 'The current North Star, a pulsating Cepheid variable close to the celestial north pole.' },
  { id: 'vega', name: 'Vega', objectType: 'star', rightAscension: 279.23, declination: 38.78, description: 'A bright, nearby blue-white star once used to define the zero-point of the magnitude scale.' },
  { id: 'rigel', name: 'Rigel', objectType: 'star', rightAscension: 78.63, declination: -8.2, description: 'A blue supergiant marking the foot of Orion, among the most luminous stars visible.' },
  { id: 'antares', name: 'Antares', objectType: 'star', rightAscension: 247.35, declination: -26.43, description: 'A red supergiant rivaling Mars in colour, puffed and unstable at its evolutionary edge.' },
  { id: 'aldebaran', name: 'Aldebaran', objectType: 'star', rightAscension: 68.98, declination: 16.51, description: 'An orange giant, the glowing eye of the bull in Taurus.' },
  { id: 'arcturus', name: 'Arcturus', objectType: 'star', rightAscension: 213.92, declination: 19.18, description: 'A nearby orange giant, the brightest star of the northern celestial hemisphere.' },
  { id: 'proxima', name: 'Proxima Centauri', objectType: 'star', rightAscension: 217.45, declination: -62.68, description: 'The closest known star to the Sun, a faint red dwarf hosting potentially habitable worlds.' },
  { id: 'mira', name: 'Mira', objectType: 'star', rightAscension: 34.84, declination: -2.98, description: 'The prototype pulsating red giant whose brightness changes dramatically over months.' },
  { id: 'algol', name: 'Algol', objectType: 'star', rightAscension: 47.04, declination: 40.96, description: 'The "demon star", an eclipsing binary that visibly dims and brightens on a regular cycle.' },
  { id: 'capella', name: 'Capella', objectType: 'star', rightAscension: 79.17, declination: 45.99, description: 'A bright yellow-giant system high in the northern winter sky.' },

  { id: 'barnards', name: 'Barnard\u2019s Star', objectType: 'star', rightAscension: 269.452, declination: 4.6934, description: 'A faint red dwarf with the largest proper motion of any known star, racing across our sky.' },

  // --- Planets (demo sky positions; planets move, so these are illustrative) ---
  { id: 'jupiter', name: 'Jupiter', objectType: 'planet', rightAscension: 250.0, declination: -18.0, description: 'The Solar System\u2019s largest planet, a swirling gas giant banded by storm systems.' },
  { id: 'saturn', name: 'Saturn', objectType: 'planet', rightAscension: 320.0, declination: -12.0, description: 'A gas giant famed for its broad, bright ring system of ice and dust.' },
  { id: 'mars', name: 'Mars', objectType: 'planet', rightAscension: 280.0, declination: -22.0, description: 'A cold desert world whose surface records a wetter, warmer past.' },
  { id: 'venus', name: 'Venus', objectType: 'planet', rightAscension: 200.0, declination: -10.0, description: 'A scorching, cloud-shrouded world that once may have held oceans.' },
  { id: 'mercury', name: 'Mercury', objectType: 'planet', rightAscension: 190.0, declination: -5.0, description: 'The smallest planet, a cratered world of extreme day-night temperature swings.' },
  { id: 'uranus', name: 'Uranus', objectType: 'planet', rightAscension: 45.0, declination: 15.0, description: 'An ice giant tipped on its side, rolling along its orbit.' },
  { id: 'epsilon', name: 'Epsilon Eridani b', objectType: 'planet', rightAscension: 53.23, declination: -9.46, description: 'A giant planet circling Epsilon Eridani, one of the nearest Sun-like stars, shown here as an artist\u2019s ringed world.' },
  { id: 'neptune', name: 'Neptune', objectType: 'planet', rightAscension: 350.0, declination: -8.0, description: 'A distant, windswept ice giant of deep blue methane skies.' },

  // --- Dwarf planets ---
  { id: 'pluto', name: 'Pluto', objectType: 'dwarfPlanet', rightAscension: 286.0, declination: -14.0, description: 'A complex icy world with a thin atmosphere and a heart-shaped nitrogen plain.' },
  { id: 'ceres', name: 'Ceres', objectType: 'dwarfPlanet', rightAscension: 230.0, declination: 8.0, description: 'The largest body in the asteroid belt, host to mysterious bright salt deposits.' },
  { id: 'eris', name: 'Eris', objectType: 'dwarfPlanet', rightAscension: 42.0, declination: -0.5, description: 'A distant, massive dwarf planet that prompted the redefinition of "planet".' },
  { id: 'haumea', name: 'Haumea', objectType: 'dwarfPlanet', rightAscension: 195.0, declination: 22.0, description: 'A rapidly spinning dwarf planet stretched into an elongated, egg-like shape.' },
  { id: 'makemake', name: 'Makemake', objectType: 'dwarfPlanet', rightAscension: 180.0, declination: 26.0, description: 'A frozen reddish dwarf planet of the distant Kuiper Belt.' },

  // --- Comets ---
  { id: 'halley', name: 'Halley\u2019s Comet', objectType: 'comet', rightAscension: 90.0, declination: 20.0, description: 'The famous short-period comet that returns to the inner Solar System roughly every 76 years.' },
  { id: 'halebopp', name: 'Hale\u2013Bopp', objectType: 'comet', rightAscension: 280.0, declination: -30.0, description: 'A long-period comet that put on one of the brightest shows of the 20th century.' },
  { id: 'neowise', name: 'Comet NEOWISE', objectType: 'comet', rightAscension: 130.0, declination: 45.0, description: 'A recently discovered comet with a striking twin ion and dust tail.' },
  { id: 'encke', name: 'Comet Encke', objectType: 'comet', rightAscension: 330.0, declination: 20.0, description: 'The comet with the shortest known period, completing an orbit roughly every 3.3 years.' },
  { id: '67p', name: '67P/Churyumov\u2013Gerasimenko', objectType: 'comet', rightAscension: 310.0, declination: 10.0, description: 'A duck-shaped comet famously visited and landed upon by a robotic mission.' },

  // --- Asteroids ---
  { id: 'vesta', name: 'Vesta', objectType: 'asteroid', rightAscension: 105.0, declination: 5.0, description: 'The second-largest asteroid, a differentiated world with a giant impact basin.' },
  { id: 'pallas', name: 'Pallas', objectType: 'asteroid', rightAscension: 110.0, declination: 3.0, description: 'A heavily inclined asteroid, one of the largest in the main belt.' },
  { id: 'hygiea', name: 'Hygiea', objectType: 'asteroid', rightAscension: 200.0, declination: -20.0, description: 'A nearly spherical asteroid that may rival Ceres as a dwarf planet.' },
  { id: 'eros', name: 'Eros', objectType: 'asteroid', rightAscension: 50.0, declination: 10.0, description: 'A peanut-shaped near-Earth asteroid once orbited by a spacecraft.' },
  { id: 'itokawa', name: 'Itokawa', objectType: 'asteroid', rightAscension: 305.0, declination: -5.0, description: 'A rubble-pile asteroid whose sample return revealed its surface history.' },
  { id: 'bennu', name: 'Bennu', objectType: 'asteroid', rightAscension: 285.0, declination: -18.0, description: 'A carbon-rich near-Earth asteroid that delivered a sample to Earth.' },
  { id: 'toutatis', name: 'Toutatis', objectType: 'asteroid', rightAscension: 250.0, declination: 2.0, description: 'A slowly tumbling, oddly shaped near-Earth asteroid.' },

  // --- Brown dwarfs ---
  { id: 'luhman16', name: 'Luhman 16', objectType: 'brownDwarf', rightAscension: 162.3, declination: -53.32, description: 'The closest known brown dwarfs \u2014 a binary too low in mass to fuse hydrogen.' },
  { id: 'epsindib', name: 'Epsilon Indi B', objectType: 'brownDwarf', rightAscension: 331.044, declination: -56.783, description: 'A pair of brown dwarfs, Epsilon Indi Ba and Bb, orbiting the orange star Epsilon Indi A about 12 light-years away.' },
  { id: 'wise0855', name: 'WISE 0855\u22120714', objectType: 'brownDwarf', rightAscension: 133.8, declination: -7.24, description: 'One of the coldest known substellar objects, a sub-Jupiter-mass wanderer.' },
  { id: 'teide1', name: 'Teide 1', objectType: 'brownDwarf', rightAscension: 56.83, declination: 24.37, description: 'The first object confirmed as a brown dwarf, defining the class.' },
  { id: 'kelu1', name: 'Kelu-1', objectType: 'brownDwarf', rightAscension: 196.42, declination: -25.75, description: 'A cool, low-gravity brown dwarf used as a benchmark for such objects.' },
  { id: 'gliese229b', name: 'Gliese 229B', objectType: 'brownDwarf', rightAscension: 92.64, declination: -21.86, description: 'The first brown dwarf discovered orbiting another star, methane-rich and cool.' },

  // --- Galaxies ---
  { id: 'andromeda', name: 'Andromeda Galaxy', objectType: 'galaxy', rightAscension: 10.68, declination: 41.27, description: 'The nearest large spiral galaxy to the Milky Way, on a slow collision course with us.' },
  { id: 'triangulum', name: 'Triangulum Galaxy', objectType: 'galaxy', rightAscension: 23.46, declination: 30.66, description: 'A small spiral galaxy, the third-largest in our Local Group.' },
  { id: 'whirlpool', name: 'Whirlpool Galaxy', objectType: 'galaxy', rightAscension: 202.47, declination: 47.2, description: 'A grand-design spiral interacting with a smaller companion.' },
  { id: 'sombrero', name: 'Sombrero Galaxy', objectType: 'galaxy', rightAscension: 189.99, declination: -11.62, description: 'A galaxy with a brilliant central bulge crossed by a dark dust lane.' },
  { id: 'pinwheel', name: 'Pinwheel Galaxy', objectType: 'galaxy', rightAscension: 210.8, declination: 54.35, description: 'A face-on spiral showcasing graceful, open spiral arms.' },
  { id: 'centaurusa', name: 'Centaurus A', objectType: 'galaxy', rightAscension: 194.72, declination: -43.02, description: 'An active galaxy with a colossal relativistic jet from its central black hole.' },
  { id: 'ngc1300', name: 'NGC 1300', objectType: 'galaxy', rightAscension: 49.92, declination: -19.41, description: 'A barred spiral with a long, luminous central bar.' },
  { id: '3c278', name: '3C 278 (M84)', objectType: 'galaxy', rightAscension: 186.27, declination: 12.89, description: 'A giant elliptical radio galaxy whose central black hole drives twin jets of plasma.' },
  { id: 'lmc', name: 'Large Magellanic Cloud', objectType: 'galaxy', rightAscension: 80.89, declination: -69.76, description: 'A satellite galaxy of the Milky Way, host to spectacular star-forming regions.' },
  { id: 'smc', name: 'Small Magellanic Cloud', objectType: 'galaxy', rightAscension: 13.16, declination: -72.8, description: 'A dwarf galaxy companion of the Milky Way rich in young stars.' },
  { id: 'ngc7331', name: 'NGC 7331', objectType: 'galaxy', rightAscension: 339.97, declination: 34.36, description: 'A spiral galaxy often called a "twin" of the Milky Way in size and shape.' },
  // --- Added to fill out the map ---
  { id: 'sun', name: 'The Sun', objectType: 'star', rightAscension: 0, declination: 0, description: 'Our own star, a middle-aged yellow dwarf holding the Solar System together with its gravity.' },
  { id: 'etacarinae', name: 'Eta Carinae', objectType: 'star', rightAscension: 161.26, declination: -59.68, description: 'A violent, unstable star system hundreds of times the Sun\u2019s mass, wrapped in the glowing Homunculus Nebula it threw off in the 1840s.' },
  { id: 'earth', name: 'Earth', objectType: 'planet', rightAscension: 0, declination: 0, description: 'Our home world, the only place known to host life, seen from space as a blue marble.' },
  { id: 'tempel1', name: 'Comet Tempel 1', objectType: 'comet', rightAscension: 0, declination: 0, description: 'The comet NASA\u2019s Deep Impact probe struck in 2005 to look beneath its surface.' },
  { id: 'wild2', name: 'Comet Wild 2', objectType: 'comet', rightAscension: 0, declination: 0, description: 'A comet whose dust was captured by the Stardust spacecraft and returned to Earth.' },
  { id: 'ison', name: 'Comet ISON', objectType: 'comet', rightAscension: 0, declination: 0, description: 'A sungrazing comet that was torn apart in 2013 as it swung past the Sun.' },
  { id: 'borisov', name: '2I/Borisov', objectType: 'comet', rightAscension: 0, declination: 0, description: 'Only the second known visitor from another star system, a comet passing through in 2019.' },
  { id: 'ida', name: '243 Ida', objectType: 'asteroid', rightAscension: 0, declination: 0, description: 'A main-belt asteroid that surprised astronomers by having its own tiny moon, Dactyl.' },
  { id: 'gaspra', name: '951 Gaspra', objectType: 'asteroid', rightAscension: 0, declination: 0, description: 'The first asteroid ever photographed up close, by the Galileo spacecraft in 1991.' },
  { id: 'lutetia', name: '21 Lutetia', objectType: 'asteroid', rightAscension: 0, declination: 0, description: 'A large main-belt asteroid visited by the Rosetta spacecraft on its way to a comet.' },
  { id: 'psyche', name: '16 Psyche', objectType: 'asteroid', rightAscension: 0, declination: 0, description: 'A metal-rich asteroid that may be the exposed core of a world that never finished forming.' },
  { id: 'arrokoth', name: 'Arrokoth', objectType: 'asteroid', rightAscension: 0, declination: 0, description: 'A snowman-shaped Kuiper Belt object, the most distant world ever explored up close.' },
  { id: 'ryugu', name: '162173 Ryugu', objectType: 'asteroid', rightAscension: 0, declination: 0, description: 'A spinning-top shaped near-Earth asteroid that gave up samples to Japan\u2019s Hayabusa2.' },
  { id: 'm87', name: 'Messier 87', objectType: 'galaxy', rightAscension: 187.71, declination: 12.39, description: 'A giant elliptical galaxy whose central black hole was the first ever imaged.' },
  { id: 'cartwheel', name: 'Cartwheel Galaxy', objectType: 'galaxy', rightAscension: 6.44, declination: -33.71, description: 'A galaxy rippled into a giant ring after a smaller galaxy plunged through its centre.' },
  { id: 'antennae', name: 'Antennae Galaxies', objectType: 'galaxy', rightAscension: 180.47, declination: -18.88, description: 'Two galaxies colliding, flinging out long tails of stars and igniting bursts of star formation.' },
  { id: 'm82', name: 'Cigar Galaxy (M82)', objectType: 'galaxy', rightAscension: 148.97, declination: 69.68, description: 'A starburst galaxy forming stars ten times faster than the Milky Way, blowing gas out in great plumes.' },
  { id: 'blackeye', name: 'Black Eye Galaxy', objectType: 'galaxy', rightAscension: 194.18, declination: 21.68, description: 'A spiral galaxy with a dramatic dark band of dust across its bright core.' },
]

export const ANCHORS: AnchorSeed[] = placeOnEcliptic(RAW_ANCHORS)
