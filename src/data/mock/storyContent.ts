import type { ObjectType } from '../models'

// General, authentic astronomy knowledge per object classification. The story builder
// combines these with per-object data so every page uses the same template while the
// narrative stays informative. Individual mock observations remain clearly illustrative.

export interface TypeFacts {
  intro: string
  care: string
  infrared: string
  variability: string
  legacy: string
}

export const TYPE_FACTS: Record<ObjectType, TypeFacts> = {
  star: {
    intro:
      'Stars are enormous spheres of hot plasma that shine by fusing lighter elements into heavier ones in their cores. Their colour, brightness and lifespan are set mostly by mass: small red dwarfs can burn for trillions of years, while the most massive blue stars live only a few million.',
    care:
      'Stars forged nearly every element heavier than hydrogen and helium, and they host the planets we search for life around. Mapping their ages, compositions and pulsations lets astronomers trace how our galaxy assembled and how long a world can stay habitable.',
    infrared:
      'In near-infrared light, dust that blocks visible starlight becomes more transparent, and cool red giants and dwarfs shine brightly. Spectra also reveal absorption features from molecules in stellar atmospheres and from ices in the clouds around young stars.',
    variability:
      'Many stars vary. Some pulse in size, some are eclipsed by a companion, and others flare or slowly dim as they age. Comparing images taken years apart is one of the simplest ways to catch these changes.',
    legacy:
      'Every star is a clue to stellar evolution. Following enough of them over time shows how stars are born, live and die, and how they return heavy elements to space for the next generation.',
  },
  planet: {
    intro:
      'Planets are large, nearly round worlds that orbit a star and have cleared their orbital neighbourhood of debris. In our Solar System they range from small rocky bodies with thin or no atmospheres to gas and ice giants wrapped in deep, churning envelopes.',
    care:
      'Planets are where atmospheres, oceans and possibly life can exist. Studying the ones next door teaches us how worlds form, how climates change, and what to look for when we observe planets around other stars.',
    infrared:
      'Planets reflect sunlight and also glow with their own heat. Near-infrared spectra can reveal methane, water vapour and ices, and show how clouds and hazes shape the light that comes back to us.',
    variability:
      'Planets change on every timescale. Storms form and fade, seasons shift the brightness of polar caps and clouds, and a rotating world shows a different face from one hour to the next.',
    legacy:
      'Watching planets over many years builds a record of weather and climate. That record helps us understand our own world and judge which distant worlds might be worth a closer look.',
  },
  dwarfPlanet: {
    intro:
      'Dwarf planets are round worlds that orbit the Sun but share their neighbourhood with many other bodies. Most live in the asteroid belt or the Kuiper Belt, where ice and rock have been preserved since the early Solar System.',
    care:
      'These small worlds are time capsules. Their surfaces hold ices and organic compounds that have barely changed for billions of years, so they show what the outer Solar System was made of when the planets formed.',
    infrared:
      'Near-infrared spectroscopy is a key tool for icy bodies. Different ices such as water, methane and nitrogen absorb light at characteristic wavelengths, which lets astronomers map what a surface is made of from far away.',
    variability:
      'Dwarf planets move slowly against the stars, and their surfaces can brighten or darken as they rotate and as thin atmospheres freeze and thaw along their long orbits.',
    legacy:
      'Each dwarf planet is a different experiment in how small worlds evolve. Together they help explain how the Solar System was built and why it looks the way it does today.',
  },
  comet: {
    intro:
      'Comets are icy bodies a few kilometres across, often described as dirty snowballs. When one nears the Sun, its ices turn to gas and release dust, forming a glowing coma and tails that can stretch for millions of kilometres.',
    care:
      'Comets are leftovers from the birth of the Solar System, stored in the cold outer regions for billions of years. Their composition tells us what the early disk of gas and dust contained, and they may have delivered water and organics to young Earth.',
    infrared:
      'Infrared light is ideal for comets. It can trace the dust in their tails, measure the gases boiling off the nucleus, and detect carbon dioxide and water ice that are hard to see at visible wavelengths.',
    variability:
      'Comets are among the most changeable objects in the sky. Their brightness can jump suddenly during outbursts, their tails swing as the solar wind shifts, and their activity rises and falls along the orbit.',
    legacy:
      'Following a comet through its orbit shows how an icy body ages and loses material. It is a rare chance to watch the most primitive building blocks of the Solar System change in real time.',
  },
  asteroid: {
    intro:
      'Asteroids are rocky or metallic remnants left over from the formation of the planets. Most orbit in the main belt between Mars and Jupiter, while others follow paths that bring them close to Earth.',
    care:
      'Asteroids preserve the raw material of the early Solar System, and some carry water and carbon-rich compounds. Tracking their orbits is also essential for planetary defence, because it tells us which ones could one day approach our world.',
    infrared:
      'An asteroid absorbs sunlight and re-radiates it as heat, so infrared measurements reveal its size and how dark its surface is. Near-infrared spectra help classify asteroids by the minerals they contain.',
    variability:
      'Asteroids tumble and spin, so their brightness changes as different sides face us. Over longer periods their orbits are nudged by sunlight itself, a subtle effect that adds up over years.',
    legacy:
      'Each asteroid is a fragment of a world that never finished forming. Studying many of them over time shows how planets assembled and how collisions continue to reshape the belt.',
  },
  brownDwarf: {
    intro:
      'Brown dwarfs sit between planets and stars. They form like stars from collapsing gas clouds, but they are too small to sustain hydrogen fusion, so they slowly cool and fade, glowing mostly in the infrared.',
    care:
      'Their atmospheres resemble those of giant planets, yet they float freely and are easy to study without a bright star nearby. They help us understand how clouds, weather and chemistry work on cool, gas-rich worlds.',
    infrared:
      'Because brown dwarfs are cool, nearly all of their light is infrared. Spectra show strong bands of water and methane, and the exact pattern reveals temperature, composition and cloud structure.',
    variability:
      'Brown dwarfs rotate quickly, and patchy clouds can carry bright and dark regions across their disks. That makes their brightness rise and fall over hours, and the patterns evolve from one year to the next.',
    legacy:
      'Brown dwarfs fill the gap between the lightest stars and the heaviest planets. Counting and characterising them shows how often star formation produces objects of such low mass.',
  },
  galaxy: {
    intro:
      'Galaxies are vast systems of stars, gas, dust and dark matter bound together by gravity. They come as graceful spirals, smooth ellipticals and irregular clouds, and a single one can hold hundreds of billions of stars.',
    care:
      'Galaxies are the building blocks of the universe. How they grow, merge and form stars over cosmic time tells us how matter was gathered together and how the large-scale structure of the cosmos came to be.',
    infrared:
      'Near-infrared light passes through much of a galaxy\u2019s dust and picks out its older stars, giving a clearer view of its overall mass. Spectra also reveal the redshift that marks a galaxy\u2019s distance and the ices and dust in its star-forming regions.',
    variability:
      'Galaxies change slowly, but parts of them flicker. Supernovae brighten individual stars to outshine entire regions, and active nuclei powered by black holes can vary over weeks to years.',
    legacy:
      'Mapping galaxies across the whole sky reveals how structure grew from the early universe. Repeated surveys add the dimension of time, turning a static map into a record of cosmic evolution.',
  },
}

export const SPHEREX_CONTEXT =
  'NASA\u2019s SPHEREx mission is designed to survey the entire sky in near-infrared light, splitting it into 102 colours and repeating the survey several times. That combination of full coverage, many wavelengths and repeated looks is what makes studying change over time possible.'
