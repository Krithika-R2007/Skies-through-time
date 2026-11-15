import type {
  CelestialObject,
  ObjectComparison,
  ObjectStory,
  Observation,
  SpectralBand,
  StorySection,
} from '../models'
import type { ObjectType } from '../models'
import { OBJECT_TYPES } from '../models'
import { ANCHORS, eclipticDec } from './anchors'
import { SPHEREX_CONTEXT, TYPE_FACTS } from './storyContent'
import { applyCuratedStory } from './curatedStories'
import { createRng, hashString } from './prng'
import { projectToPlane } from '../../utils/coordinates'
import { layoutPosition } from '../../utils/mapLayout'

const DEMO_SOURCE = 'Demonstration data \u2014 simulated SPHEREx-style observation'

type ImageStyle = 'nebula' | 'cluster' | 'surface' | 'disk' | 'field'

const TYPE_HUE: Record<ObjectType, number> = {
  star: 45,
  planet: 205,
  dwarfPlanet: 280,
  comet: 185,
  asteroid: 28,
  brownDwarf: 22,
  galaxy: 305,
}
const TYPE_STYLE: Record<ObjectType, ImageStyle> = {
  star: 'cluster',
  planet: 'surface',
  dwarfPlanet: 'surface',
  comet: 'nebula',
  asteroid: 'surface',
  brownDwarf: 'nebula',
  galaxy: 'disk',
}

const TYPE_WEIGHTS: Record<ObjectType, number> = {
  star: 0.34,
  galaxy: 0.2,
  asteroid: 0.16,
  comet: 0.1,
  planet: 0.08,
  brownDwarf: 0.07,
  dwarfPlanet: 0.05,
}

const TYPE_DESCRIPTION: Record<ObjectType, string> = {
  star: 'A luminous sphere of plasma generating light through nuclear fusion.',
  planet: 'A world shaped by orbit and atmosphere, seen in reflected sunlight.',
  dwarfPlanet: 'A small, nearly round world that has not cleared its orbital neighbourhood.',
  comet: 'An icy body that releases gas and dust as it nears the Sun, forming a glowing tail.',
  asteroid: 'A rocky remnant from the early Solar System, drifting along a stable orbit.',
  brownDwarf: 'A "failed star" too low in mass to sustain hydrogen fusion, glowing faintly in infrared.',
  galaxy: 'A vast island of stars, gas, and dust bound together by gravity.',
}

const GENERATED_COUNT = 0

function weightedType(rng: () => number): ObjectType {
  const total = OBJECT_TYPES.reduce((s, t) => s + TYPE_WEIGHTS[t], 0)
  let r = rng() * total
  for (const t of OBJECT_TYPES) {
    r -= TYPE_WEIGHTS[t]
    if (r <= 0) return t
  }
  return 'star'
}

export interface AstronomyDataset {
  objects: CelestialObject[]
  observations: Observation[]
  comparisons: ObjectComparison[]
  stories: ObjectStory[]
  spectralBands: SpectralBand[]
}

const DEMO_BANDS: SpectralBand[] = [
  {
    id: 'band-nir-1',
    label: 'Near-IR Band A',
    wavelengthRange: '0.80\u20131.10 \u00b5m',
    description:
      'A short-wavelength near-infrared band. Highlights warm dust and reflected starlight.',
    isDemoData: true,
  },
  {
    id: 'band-nir-2',
    label: 'Near-IR Band B',
    wavelengthRange: '1.10\u20131.50 \u00b5m',
    description:
      'A longer near-infrared band sensitive to cooler thermal emission.',
    isDemoData: true,
  },
]

function observationCount(seed: number, rng: () => number): number {
  if (seed === 0) return 0
  if (seed === 1) return 1
  const r = rng()
  if (r < 0.18) return 0
  if (r < 0.34) return 1
  return 6
}

function makeImage(seed: string, style: ImageStyle, hue: number) {
  return { seed, style, hue }
}

const DEMO_YEARS = ['2019', '2020', '2021', '2022', '2023', '2024']

function buildObservations(object: CelestialObject, count: number): Observation[] {
  const obs: Observation[] = []
  for (let i = 0; i < count; i++) {
    const year = DEMO_YEARS[i] ?? `20${18 + i}`
    const id = `obs-${object.id}-${i + 1}`
    const hueShift = (TYPE_HUE[object.objectType] + i * 12) % 360
    obs.push({
      id,
      objectId: object.id,
      observationDate: `${year}-0${(i % 9) + 1}-15`,
      observationEpoch: year,
      imagePlaceholder: makeImage(id, TYPE_STYLE[object.objectType], hueShift),
      spectralBand: i % 2 === 0 ? DEMO_BANDS[0].id : DEMO_BANDS[1].id,
      description: `Frame of ${object.name} from epoch ${year}.`,
      source: DEMO_SOURCE,
      isDemoData: true,
    })
  }
  return obs
}

const CHANGE_PHRASES = [
  'A faint smudge brightens near the object\u2019s core.',
  'The outer glow expands slightly between epochs.',
  'A new point of light appears just south of the centre.',
  'The central region shifts from warm to cooler tones.',
  'A thin streak of emission fades across the field.',
  'The object\u2019s outline becomes more diffuse over time.',
]
const INTERPRETATION_PHRASES = [
  'Likely driven by changing illumination or intrinsic variability.',
  'Consistent with slow motion of material in or around the object.',
  'May reflect episodic activity or changing illumination.',
  'A real measurement would distinguish true change from noise.',
  'Such shifts often trace evolving structure at different depths.',
  'The underlying cause would need follow-up measurements.',
]

function buildComparisons(object: CelestialObject, observations: Observation[]): ObjectComparison[] {
  const comps: ObjectComparison[] = []
  for (let i = 0; i < observations.length - 1; i++) {
    const first = observations[i]
    const second = observations[i + 1]
    const rng = createRng(hashString(object.id) ^ (i * 2654435761))
    const regionX = 0.35 + rng() * 0.2
    const regionY = 0.35 + rng() * 0.2
    const id = `cmp-${object.id}-${i + 1}`
    comps.push({
      id,
      firstObservationId: first.id,
      secondObservationId: second.id,
      highlightedRegions: [{ x: regionX, y: regionY, width: 0.18, height: 0.18 }],
      annotations: [
        {
          regionIndex: 0,
          arrow: { from: { x: regionX - 0.12, y: regionY - 0.12 }, to: { x: regionX + 0.09, y: regionY + 0.09 } },
          label: CHANGE_PHRASES[(i + hashString(object.id)) % CHANGE_PHRASES.length],
        },
      ],
      changeDescription: CHANGE_PHRASES[(i + 1) % CHANGE_PHRASES.length],
      scientificInterpretation: INTERPRETATION_PHRASES[(i + 2) % INTERPRETATION_PHRASES.length],
      isDemoData: true,
    })
  }
  return comps
}

function buildStory(object: CelestialObject, observationCount: number): ObjectStory {
  const obsLine =
    observationCount === 0
      ? `SPHEREx has no recorded visits to ${object.name} yet.`
      : observationCount === 1
        ? `${object.name} has been seen once so far.`
        : `${object.name} has been seen ${observationCount} times across several epochs.`

  const hue = TYPE_HUE[object.objectType]
  const style = TYPE_STYLE[object.objectType]
  const f = TYPE_FACTS[object.objectType]
  const P = (...parts: string[]) => parts.join('\n\n')
  const sections: StorySection[] = [
    {
      title: 'Meet the Object',
      description: P(f.intro, `${object.name}: ${object.description}`),
      image: makeImage(`story-${object.id}-1`, style, hue),
    },
    {
      title: 'Why Should We Care?',
      description: P(
        f.care,
        `Objects like ${object.name} let astronomers test ideas about formation and evolution against real examples, rather than relying on theory alone. Repeated viewing reveals what a single snapshot never can.`,
      ),
      image: makeImage(`story-${object.id}-2`, style, (hue + 40) % 360),
    },
    {
      title: 'Its Observation History',
      description: P(
        obsLine,
        'Looking at the same target again and again is powerful. Each new epoch acts like a frame in a film: on its own it shows one moment, but together the frames reveal motion, brightening, fading and drift.',
        SPHEREX_CONTEXT,
      ),
      image: makeImage(`story-${object.id}-3`, style, (hue + 80) % 360),
    },
    {
      title: 'Investigate the Evidence',
      description: P(
        f.infrared,
        'Every SPHEREx visit records the same patch of sky through 102 narrow infrared colours. Stepping through them on the object page shows which features glow at which wavelength, and the spectrum chart turns that into a fingerprint of what the object is made of.',
      ),
      image: makeImage(`story-${object.id}-4`, style, (hue + 120) % 360),
    },
    {
      title: 'What Changed?',
      description: P(
        f.variability,
        observationCount >= 2
          ? 'The play page lines the visits up so you can spot differences between epochs: a brightening core, a shifting glow, a fading streak. Compare subtracts two epochs, and Discover scans the whole field for movers.'
          : `Change needs at least two visits, and ${object.name} has fewer than that so far. As SPHEREx returns, comparisons become possible.`,
      ),
      image: makeImage(`story-${object.id}-5`, style, (hue + 160) % 360),
    },
    {
      title: 'What Can We Learn?',
      description: P(
        f.legacy,
        `Following ${object.name} over time turns a static dot into a story of change, and that is how a sky survey becomes a record of cosmic evolution.`,
      ),
      image: makeImage(`story-${object.id}-6`, style, (hue + 200) % 360),
    },
  ]

  return applyCuratedStory({ objectId: object.id, sections, isDemoData: true })
}

/** Demonstration observations, comparisons and story for a single object (used for objects resolved at runtime). */
export function buildObjectBundle(object: CelestialObject, count = 6) {
  const observations = buildObservations(object, count)
  object.observationIds = observations.map((o) => o.id)
  return { observations, comparisons: buildComparisons(object, observations), story: buildStory(object, count) }
}

export function generateDataset(): AstronomyDataset {
  const objects: CelestialObject[] = []
  const observations: Observation[] = []
  const comparisons: ObjectComparison[] = []
  const stories: ObjectStory[] = []

  for (const a of ANCHORS) {
    const pos = layoutPosition(a.id, a.rightAscension, a.declination)
    const obj: CelestialObject = {
      id: a.id,
      name: a.name,
      objectType: a.objectType,
      rightAscension: a.rightAscension,
      declination: a.declination,
      visualPosition: pos,
      description: a.description,
      animationType: a.objectType,
      observationIds: [],
    }
    const obs = buildObservations(obj, 6)
    obj.observationIds = obs.map((o) => o.id)
    objects.push(obj)
    observations.push(...obs)
    comparisons.push(...buildComparisons(obj, obs))
    stories.push(buildStory(obj, obs.length))
  }

  const rng = createRng(1729)
  for (let i = 0; i < GENERATED_COUNT; i++) {
    const type = weightedType(rng)
    const ra = rng() * 360
    const rawDec = rng() * 180 - 90
    // Bodies of the Solar System keep to the ecliptic band; the rest are spread over the sky.
    const solar = type === 'planet' || type === 'dwarfPlanet' || type === 'comet' || type === 'asteroid'
    const dec = solar ? eclipticDec(ra) + (rng() - 0.5) * (type === 'comet' ? 50 : 14) : rawDec
    const id = `SPX-${String(i + 1).padStart(4, '0')}`
    const pos = projectToPlane(ra, dec)
    const obj: CelestialObject = {
      id,
      name: id,
      objectType: type,
      rightAscension: ra,
      declination: dec,
      visualPosition: pos,
      description: TYPE_DESCRIPTION[type],
      animationType: type,
      observationIds: [],
    }
    const count = observationCount(i, rng)
    const obs = buildObservations(obj, count)
    obj.observationIds = obs.map((o) => o.id)
    objects.push(obj)
    observations.push(...obs)
    comparisons.push(...buildComparisons(obj, obs))
    stories.push(buildStory(obj, obs.length))
  }

  return { objects, observations, comparisons, stories, spectralBands: DEMO_BANDS }
}
