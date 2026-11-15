import type {
  CelestialObject,
  ObjectComparison,
  ObjectStory,
  Observation,
  ObjectType,
} from '../models'
import type { SearchResult } from '../api/types'
import { buildObjectBundle } from '../mock'
import { projectToPlane } from '../../utils/coordinates'
import { MockAstronomyProvider } from './MockAstronomyProvider'

// The demonstration catalogue plus objects resolved at runtime (SIMBAD names, Gaia IDs,
// raw coordinates). A resolved object's id carries its coordinates, so its page still
// works after a reload or when opened from a link.

const ID = /^sky-(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)(?:_(.*))?$/

export function guessType(simbadType: string | null): ObjectType {
  const t = (simbadType ?? '').toLowerCase()
  if (/brown|y dwarf|t dwarf|l dwarf/.test(t)) return 'brownDwarf'
  if (/galax|agn|seyfert|quasar|blazar/.test(t)) return 'galaxy'
  if (/comet/.test(t)) return 'comet'
  if (/asteroid|minor planet/.test(t)) return 'asteroid'
  if (/planet/.test(t)) return 'planet'
  return 'star'
}

const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export class LiveAstronomyProvider extends MockAstronomyProvider {
  private resolved = new Map<string, { obj: CelestialObject; bundle: ReturnType<typeof buildObjectBundle> }>()

  private build(id: string, name: string, ra: number, dec: number, type: ObjectType, description: string) {
    const existing = this.resolved.get(id)
    if (existing) return existing.obj
    const obj: CelestialObject = {
      id, name, objectType: type, rightAscension: ra, declination: dec,
      visualPosition: projectToPlane(ra, dec), description, animationType: type, observationIds: [],
    }
    this.resolved.set(id, { obj, bundle: buildObjectBundle(obj) })
    return obj
  }

  registerResolved(r: SearchResult): CelestialObject {
    const label = r.name?.trim() || `RA ${r.ra.toFixed(3)}\u00b0, Dec ${r.dec.toFixed(3)}\u00b0`
    const id = `sky-${r.ra.toFixed(4)}_${r.dec.toFixed(4)}_${slug(label)}`
    const type = guessType(r.object_type)
    const via = r.source === 'simbad' ? 'SIMBAD' : r.source === 'gaia' ? 'the Gaia catalogue' : 'the coordinates you entered'
    return this.build(
      id, label, r.ra, r.dec, type,
      `${r.object_type ? `${r.object_type}. ` : ''}Resolved through ${via} at RA ${r.ra.toFixed(4)}\u00b0, Dec ${r.dec.toFixed(4)}\u00b0.`,
    )
  }

  getObjectById(id: string): CelestialObject | undefined {
    const known = super.getObjectById(id) ?? this.resolved.get(id)?.obj
    if (known) return known
    const m = ID.exec(id)
    if (!m) return undefined
    const ra = Number(m[1])
    const dec = Number(m[2])
    if (!(ra >= 0 && ra < 360 && dec >= -90 && dec <= 90)) return undefined
    const name = m[3] ? m[3].replace(/-/g, ' ') : `RA ${ra.toFixed(3)}\u00b0, Dec ${dec.toFixed(3)}\u00b0`
    return this.build(id, name, ra, dec, 'star', `A sky position at RA ${ra.toFixed(4)}\u00b0, Dec ${dec.toFixed(4)}\u00b0.`)
  }

  getObservations(objectId: string): Observation[] {
    const r = this.resolved.get(objectId) ?? (this.getObjectById(objectId) && this.resolved.get(objectId))
    return r ? r.bundle.observations : super.getObservations(objectId)
  }

  getComparisons(objectId: string): ObjectComparison[] {
    const r = this.resolved.get(objectId)
    return r ? r.bundle.comparisons : super.getComparisons(objectId)
  }

  getObjectStory(objectId: string): ObjectStory | undefined {
    const r = this.resolved.get(objectId) ?? (this.getObjectById(objectId) && this.resolved.get(objectId))
    return r ? r.bundle.story : super.getObjectStory(objectId)
  }
}
