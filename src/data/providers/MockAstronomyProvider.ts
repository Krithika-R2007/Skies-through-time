import type {
  CelestialObject,
  ObjectComparison,
  ObjectStory,
  Observation,
  SpectralBand,
} from '../models'
import type { ObjectType } from '../models'
import type { AstronomyDataProvider } from './AstronomyDataProvider'
import { generateDataset } from '../mock'

export class MockAstronomyProvider implements AstronomyDataProvider {
  private dataset = generateDataset()

  getObjects(): CelestialObject[] {
    return this.dataset.objects
  }

  getObjectById(id: string): CelestialObject | undefined {
    return this.dataset.objects.find((o) => o.id === id)
  }

  searchObjects(query: string): CelestialObject[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return this.dataset.objects.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.objectType.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q),
    )
  }

  getObjectsByType(type: ObjectType): CelestialObject[] {
    return this.dataset.objects.filter((o) => o.objectType === type)
  }

  getObservations(objectId: string): Observation[] {
    return this.dataset.observations
      .filter((o) => o.objectId === objectId)
      .sort((a, b) => a.observationDate.localeCompare(b.observationDate))
  }

  getObservationById(id: string): Observation | undefined {
    return this.dataset.observations.find((o) => o.id === id)
  }

  getComparisons(objectId: string): ObjectComparison[] {
    return this.dataset.comparisons.filter(
      (c) =>
        this.dataset.observations.some((o) => o.id === c.firstObservationId && o.objectId === objectId),
    )
  }

  getObjectStory(objectId: string): ObjectStory | undefined {
    return this.dataset.stories.find((s) => s.objectId === objectId)
  }

  getSpectralBands(_objectId: string): SpectralBand[] {
    return this.dataset.spectralBands
  }
}
