export type ObjectType =
  | 'star'
  | 'planet'
  | 'dwarfPlanet'
  | 'comet'
  | 'asteroid'
  | 'brownDwarf'
  | 'galaxy'

export const OBJECT_TYPES: ObjectType[] = [
  'star',
  'planet',
  'dwarfPlanet',
  'comet',
  'asteroid',
  'brownDwarf',
  'galaxy',
]

export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  star: 'Stars',
  planet: 'Planets',
  dwarfPlanet: 'Dwarf Planets',
  comet: 'Comets',
  asteroid: 'Asteroids',
  brownDwarf: 'Brown Dwarfs',
  galaxy: 'Galaxies',
}

export type AnimationType = ObjectType
