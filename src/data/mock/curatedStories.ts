import type { ObjectStory, StoryPhoto, StorySection } from '../models'

// Hand-written stories with real NASA imagery, for the objects that have been researched.
// Every other object keeps the generated story. Facts come from NASA, Chandra, Gemini/NOIRLab,
// ESO and peer-reviewed papers; each picture's caption says whether it shows the object itself
// or a general illustration. Images are bundled under public/story so the page works offline.
//
// Section order and titles match the generated stories, and the third section's first
// paragraph is the one the page swaps for the live SPHEREx summary when that data loads.

const rawBase = (import.meta.env?.BASE_URL as string | undefined) ?? './'
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`
const img = (file: string) => `${base}story/${file}`

const pj = (id: string) => `https://photojournal.jpl.nasa.gov/catalog/${id}`

const PHOTO = {
  neighbors: {
    src: img('pia18003-neighbors.jpg'),
    alt: 'Diagram of the stars closest to the Sun, with Barnard\u2019s Star and WISE 0855 marked',
    caption: 'The Sun\u2019s closest neighbours, with the year each was discovered. Barnard\u2019s Star sits about 6 light-years out.',
    credit: 'NASA/Penn State University',
    sourceUrl: pj('PIA18003'),
  },
  redDwarf: {
    src: img('pia21473-red-dwarf.jpg'),
    alt: 'Illustration of a flaring red dwarf star with a planet',
    caption: 'A general illustration of a flaring red dwarf with a planet, the kind of star Barnard\u2019s Star is.',
    credit: 'NASA/ESA/STScI/G. Bacon',
    sourceUrl: pj('PIA21473'),
  },
  eso: {
    src: img('eso1837b-planet.jpg'),
    alt: 'Artist\u2019s impression of a planet seen from space with a distant red dwarf',
    caption:
      'An artist\u2019s impression of the planet candidate announced in 2018, which later studies did not confirm. It is not one of the four planets found in 2025.',
    credit: 'ESO/M. Kornmesser, via NASA',
    sourceUrl: 'https://science.nasa.gov/universe/exoplanets/discovery-alert-a-new-super-earth-in-the-neighborhood-six-light-years-away/',
  },
  barnardGraphs: {
    src: img('barnard-flare-graphs.jpg'),
    alt: 'Two graphs of Barnard\u2019s Star brightness over time showing flares in X-rays and ultraviolet',
    caption:
      'Real measurements of Barnard\u2019s Star: X-rays from Chandra (17 June 2019, left) and ultraviolet from Hubble (4 March 2019, right). Each spike is a flare.',
    credit: 'NASA/CXC/University of Colorado/K. France et al.; NASA/STScI',
    sourceUrl: 'https://chandra.si.edu/photo/2020/barnards/',
  },
  barnardIllustration: {
    src: img('barnard-flare-illustration.jpg'),
    alt: 'Illustration of a red dwarf erupting beside a planet losing its atmosphere, with an X-ray graph',
    caption: 'An illustration of a flaring red dwarf and a planet whose air is being stripped away, with Chandra\u2019s X-ray flare data inset.',
    credit: 'NASA/CXC/M. Weiss',
    sourceUrl: 'https://chandra.si.edu/photo/2020/barnards/',
  },
  compare: {
    src: img('compare-sun-brown-dwarf.jpg'),
    alt: 'Diagram comparing the sizes of the Sun, a low-mass star, a brown dwarf, Jupiter and Earth',
    caption: 'How a low-mass star and a brown dwarf compare in size with the Sun, Jupiter and Earth.',
    credit: 'NASA/JPL-Caltech/UCB',
    sourceUrl: 'https://science.nasa.gov/universe/exoplanets/astronomers-find-water-clouds-in-cold-jupiter-like-object/',
  },
  wiseConcept: {
    src: img('pia18001-wise0855.jpg'),
    alt: 'Artist\u2019s concept of the cold brown dwarf WISE 0855 with the Milky Way behind it',
    caption: 'An artist\u2019s concept of WISE 0855. Its colour is a guess: the real object is almost invisible, even in infrared.',
    credit: 'NASA/JPL-Caltech/Penn State University',
    sourceUrl: pj('PIA18001'),
  },
  wiseMotion: {
    src: img('pia18002-wise0855-motion.jpg'),
    alt: 'Infrared frames from WISE and Spitzer showing WISE 0855 shifting position between 2010 and 2013',
    caption: 'Real infrared images from WISE and Spitzer, 2010 to 2013. The dot moves because WISE 0855 is so close.',
    credit: 'NASA/JPL-Caltech/Penn State University',
    sourceUrl: pj('PIA18002'),
  },
  cloudBands: {
    src: img('pia21752-cloud-bands.jpg'),
    alt: 'Artist\u2019s concept of a brown dwarf with bands of clouds',
    caption: 'An artist\u2019s concept of a brown dwarf with banded, patchy clouds, like the ones seen on Neptune and the other outer planets.',
    credit: 'NASA/JPL-Caltech',
    sourceUrl: pj('PIA21752'),
  },
  weather: {
    src: img('pia21475-brown-dwarf-weather.jpg'),
    alt: 'Artist\u2019s concept of storms and lightning in a brown dwarf atmosphere',
    caption: 'A general artist\u2019s concept of weather on a brown dwarf. Spitzer found that most brown dwarfs have Jupiter-like storms.',
    credit: 'NASA/JPL-Caltech/University of Western Ontario/Stony Brook University/Tim Pyle',
    sourceUrl: pj('PIA21475'),
  },
  whatIsBrownDwarf: {
    src: img('pia23685-what-is-a-brown-dwarf.jpg'),
    alt: 'Chart placing brown dwarfs between planets and stars by mass',
    caption: 'Brown dwarfs sit between planets and stars: about 13 to 80 times the mass of Jupiter.',
    credit: 'NASA/JPL-Caltech',
    sourceUrl: pj('PIA23685'),
  },
  webbEpsIndi: {
    src: img('webb-epsilon-indi-ab.jpg'),
    alt: 'Webb infrared image of the giant planet Epsilon Indi Ab beside a blocked-out star',
    caption:
      'Webb\u2019s view of the Epsilon Indi system: the giant planet Epsilon Indi Ab (orange) next to its host star, which is blocked out and marked with a star. The brown dwarf pair B orbits far outside this picture.',
    credit: 'NASA, ESA, CSA, STScI, Elisabeth Matthews (MPIA)',
    sourceUrl: 'https://science.nasa.gov/asset/webb/epsilon-indi-ab-exoplanet-miri-image/',
  },
  twinBrownDwarfs: {
    src: img('pia12377-twin-brown-dwarfs.jpg'),
    alt: 'Spitzer infrared image of two young brown dwarfs',
    caption:
      'A Spitzer image of a different pair of young brown dwarfs, shown for comparison. Spitzer also measured the infrared light of Epsilon Indi Ba and Bb.',
    credit: 'NASA/JPL-Caltech/Calar Alto Obsv./Caltech Sub. Obsv.',
    sourceUrl: pj('PIA12377'),
  },
  wind: {
    src: img('pia23684-brown-dwarf-wind.jpg'),
    alt: 'Artist\u2019s concept of a banded brown dwarf against the Milky Way',
    caption: 'A general artist\u2019s concept of a brown dwarf. Spitzer made the first direct measurement of wind on one. This is not Epsilon Indi B itself.',
    credit: 'NASA/JPL-Caltech',
    sourceUrl: pj('PIA23684'),
  },
} satisfies Record<string, StoryPhoto>

type Entry = [title: string, text: string[], photo: StoryPhoto]

const BARNARDS: Entry[] = [
  [
    'Meet the Object',
    [
      'What is Barnard\u2019s Star? It is a small, cool red dwarf about 6 light-years from the Sun, the closest single star to us. Only the three stars of the Alpha Centauri system are nearer. It is so dim that you need a telescope to see it, and it shines much brighter in infrared light than in visible light.',
      'E. E. Barnard noticed it in 1916 at Yerkes Observatory because it moves across the sky faster than any other known star, about 10 arcseconds every year. That is roughly the width of the Moon every 175 years, which is tiny day to day but huge for a star.',
    ],
    PHOTO.neighbors,
  ],
  [
    'Why Should We Care?',
    [
      'Why does a faint star matter? Red dwarfs like Barnard\u2019s Star are by far the most common stars in the Galaxy, and they often have tightly packed families of planets. Because this one is so close, it is one of the best places to study them.',
      'Red dwarfs can also be rough on their neighbours. Many are magnetically active and throw out flares of ultraviolet light and X-rays that could strip the air from a nearby planet. Understanding stars like Barnard\u2019s helps us judge where life could survive.',
    ],
    PHOTO.redDwarf,
  ],
  [
    'Its Observation History',
    [
      'SPHEREx maps the whole sky in 102 infrared colours from 0.75 to 5 micrometres, which covers the range where a cool star like this gives off most of its light.',
      'Astronomers have watched Barnard\u2019s Star for over a century hoping to find planets. In the 1960s Peter van de Kamp claimed to see planets tugging on it, but later studies did not back him up. A 2018 report of a cold super-Earth on a 233-day orbit was later traced to a false signal from the star\u2019s own activity.',
      'The planets confirmed in 2024 and 2025 are a different and much hotter set, close to the star and found with far more precise instruments.',
    ],
    PHOTO.eso,
  ],
  [
    'Investigate the Evidence',
    [
      'How do we know about its planets and flares? In 2025 two teams reported four planets. One used the MAROON-X instrument on Gemini North, watching over 112 nights across three years, and combined its data with ESO\u2019s ESPRESSO. They measured the tiny back-and-forth wobble the planets cause in the star\u2019s light. Each planet is only 20 to 30 percent of Earth\u2019s mass and circles the star in a few days, so they are probably too hot for liquid water. They do not pass in front of the star, so their sizes are not measured.',
      'The flares were caught in 2019. Hubble watched in ultraviolet light for about seven hours on 4 March and saw two flares. Chandra watched in X-rays for about seven hours on 17 June and saw one. Adding up the time, the star is in a flare roughly a quarter of the time, even though it is about 10 billion years old.',
    ],
    PHOTO.barnardGraphs,
  ],
  [
    'What Changed?',
    [
      'What changes about Barnard\u2019s Star? Two things. Its brightness: a flare makes it jump in X-rays and ultraviolet light for a short while before it settles back, as the spikes in the previous graphs show.',
      'And its position: it drifts about 10 arcseconds a year, mostly northward. On the Play page, the Annotated tab lines up NASA\u2019s NEOWISE infrared images from 2012 to 2019 and marks where something shifted.',
    ],
    PHOTO.barnardIllustration,
  ],
  [
    'What Can We Learn?',
    [
      'What can this star teach us? NASA\u2019s flare study found that a planet orbiting an old red dwarf could be hit by damaging radiation about a quarter of the time. Even where the temperature is right, the air of such a planet may be stripped away, which makes life harder.',
      'The planet search found something else too. The Gemini team could rule out, with fair confidence, any Earth-mass planet in the star\u2019s habitable zone. One of the four planets is among the lightest ever found with this method, a sign that careful measurements of nearby stars still hold surprises.',
      'Barnard\u2019s Star is a low-mass star, much smaller than the Sun, as the size comparison shows. Studying it closely helps us understand the most common kind of star in the sky.',
    ],
    PHOTO.compare,
  ],
]

const WISE0855: Entry[] = [
  [
    'Meet the Object',
    [
      'What is WISE 0855? It is the coldest brown dwarf known, about 7 light-years from the Sun. A brown dwarf forms like a star but is too light to start nuclear fusion, so it only fades and cools. WISE 0855 has cooled until it is roughly 250 to 285 kelvin (about \u221223 to +12 \u00b0C), no colder than a chilly day on Earth, depending on the measurement.',
      'It gives off almost no visible light. Even in infrared it is barely visible to the largest ground telescopes. Its full name is WISE J085510.83\u2212071442.5.',
    ],
    PHOTO.wiseConcept,
  ],
  [
    'Why Should We Care?',
    [
      'Why is it important? It is one of the Sun\u2019s nearest neighbours, the fourth closest system, yet nobody knew about it until 2014. If something this close was hiding, other cold objects may be too.',
      'It is also so light and cold that it behaves a lot like a free-floating giant planet. That lets astronomers study the weather and chemistry of a Jupiter-like world with no bright star beside it to drown out the light.',
    ],
    PHOTO.neighbors,
  ],
  [
    'Its Observation History',
    [
      'SPHEREx\u2019s colours reach 5 micrometres, the part of the infrared where very cold objects give off their heat, so brown dwarfs like this are the kind of object it can help study.',
      'A team at Penn State found WISE 0855 in 2014 in data from NASA\u2019s WISE telescope. It first appeared in two infrared images taken six months apart in 2010, and it had moved between them. That rapid motion, about 8 arcseconds a year, gave it away. NASA\u2019s Spitzer Space Telescope took later images that helped pin down its distance.',
    ],
    PHOTO.wiseMotion,
  ],
  [
    'Investigate the Evidence',
    [
      'How do we know about its clouds? In 2024 NASA reported strong evidence for water clouds or ice, from an infrared spectrum taken with a large telescope. A spectrum spreads the light into its colours, and water leaves clear marks in it.',
      'The James Webb Space Telescope has since measured its light from 1 to 22 micrometres in detail. Repeated Webb measurements point to patchy water clouds that vary over time, the first variable water clouds seen outside our Solar System.',
    ],
    PHOTO.cloudBands,
  ],
  [
    'What Changed?',
    [
      'What changes about it? Its position, for one. It slides across the sky by about 8 arcseconds every year, which is how the real images in the earlier picture show it moving.',
      'Its brightness also seems to vary. As patchy clouds rotate in and out of view, the infrared glow rises and falls, much like the storms on Jupiter.',
    ],
    PHOTO.weather,
  ],
  [
    'What Can We Learn?',
    [
      'What can this object teach us? Brown dwarfs have between about 13 and 80 times the mass of Jupiter, so they sit between planets and stars. WISE 0855 is at the light, cold end of that range, close to the border with giant planets.',
      'Webb\u2019s spectra let astronomers measure the water and ammonia in its air, and test computer models of cold atmospheres against a real example. What we learn here also applies to giant planets around other stars.',
    ],
    PHOTO.whatIsBrownDwarf,
  ],
]

const EPS_INDI_B: Entry[] = [
  [
    'Meet the Object',
    [
      'What is Epsilon Indi B? It is a pair of brown dwarfs, Epsilon Indi Ba and Bb, that orbit an orange star called Epsilon Indi A. The system lies about 12 light-years away in the southern constellation Indus. The star is faintly visible to the naked eye, and the brown dwarfs were discovered in 2003.',
      'They are the closest known pair of brown dwarfs to us. Ba is a warm T dwarf (type T1) and Bb is a cooler one (type T6). They circle each other only about 2.7 times the Earth\u2013Sun distance apart, while the pair as a whole lies far from the star, more than a thousand times that distance.',
    ],
    PHOTO.webbEpsIndi,
  ],
  [
    'Why Should We Care?',
    [
      'Why does a pair of brown dwarfs matter? When two objects orbit each other, their motion reveals how heavy each one is. That makes Ba and Bb unusually well measured: about 67 and 53 times the mass of Jupiter, within the 13 to 80 Jupiter masses that define a brown dwarf.',
      'They also share a star with a known age. Brown dwarfs cool and fade as they age, so knowing the age and the mass gives a rare test for the models that predict how they behave.',
    ],
    PHOTO.whatIsBrownDwarf,
  ],
  [
    'Its Observation History',
    [
      'SPHEREx\u2019s pixels are about 6 arcseconds wide, while the two brown dwarfs are less than 1 arcsecond apart, so SPHEREx sees them as a single point of light. Its 102 colours measure their combined infrared glow.',
      'They were found in 2003 as a faint companion moving through space together with Epsilon Indi A. Sharper images later that year showed the companion is really two objects, about 0.7 arcseconds apart. NASA\u2019s Spitzer Space Telescope then measured their infrared spectra and confirmed one is a warmer T1 dwarf and the other a cooler T6.',
    ],
    PHOTO.twinBrownDwarfs,
  ],
  [
    'Investigate the Evidence',
    [
      'How do we know their masses? Astronomers followed the pair for about ten years with adaptive optics on the Very Large Telescope in Chile, tracking how they orbit each other and how the pair moves among the stars. Those measurements give masses of about 66.9 and 53.3 times Jupiter, each good to within about half a percent.',
      'The results suggest that brown dwarfs may cool more slowly than models predicted at the stage where their clouds clear. Spitzer, Webb and other infrared telescopes continue to study objects like these.',
    ],
    PHOTO.wind,
  ],
  [
    'What Changed?',
    [
      'What changes in this system? The two brown dwarfs circle each other, so their positions relative to one another shift from year to year. That orbital motion is exactly what astronomers tracked to weigh them.',
      'The whole system also moves across our sky, by about 4.7 arcseconds a year. And like other brown dwarfs, their brightness may vary as clouds and storms drift across their surfaces.',
    ],
    PHOTO.weather,
  ],
  [
    'What Can We Learn?',
    [
      'What can this system teach us? It holds a star, two brown dwarfs and a giant planet, all the same age and all close to us. In 2024 Webb photographed that planet, Epsilon Indi Ab, directly. It is about as cold as freezing water, one of the coldest planets ever imaged.',
      'Comparing a star, brown dwarfs and a planet that formed together is a rare chance to see where one kind of object ends and the next begins.',
    ],
    PHOTO.compare,
  ],
]

const CURATED: Record<string, Entry[]> = {
  barnards: BARNARDS,
  wise0855: WISE0855,
  epsindib: EPS_INDI_B,
}

/** Replaces a generated story's sections with the researched text and NASA images, if there are any. */
export function applyCuratedStory(story: ObjectStory): ObjectStory {
  const entries = CURATED[story.objectId]
  if (!entries) return story
  const sections: StorySection[] = entries.map(([title, text, photo], i) => ({
    title,
    description: text.join('\n\n'),
    // Keep the generated artwork as the fallback if a photo cannot load.
    image: story.sections[i]?.image ?? story.sections[0].image,
    photo,
  }))
  return { ...story, sections, isDemoData: false }
}

export const CURATED_STORY_IDS = Object.keys(CURATED)
