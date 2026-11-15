import type {
  CelestialObject,
  ObjectComparison,
  ObjectStory,
  Observation,
  SpectralBand,
} from '../models'
import type { ObjectType } from '../models'
import type { SearchResult } from '../api/types'

export interface AstronomyDataProvider {
  getObjects(): CelestialObject[]
  getObjectById(id: string): CelestialObject | undefined
  searchObjects(query: string): CelestialObject[]
  getObjectsByType(type: ObjectType): CelestialObject[]
  getObservations(objectId: string): Observation[]
  getObservationById(id: string): Observation | undefined
  getComparisons(objectId: string): ObjectComparison[]
  getObjectStory(objectId: string): ObjectStory | undefined
  getSpectralBands(objectId: string): SpectralBand[]
  /** Turns a resolved sky position (name or coordinates) into a browsable object. Optional. */
  registerResolved?(result: SearchResult): CelestialObject
}
