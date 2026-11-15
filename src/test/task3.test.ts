import { describe, it, expect } from 'vitest'
import { projectToPlane, PLANE_WIDTH, PLANE_HEIGHT } from '../utils/coordinates'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'
import { OBJECT_TYPES } from '../data/models'

const provider = new MockAstronomyProvider()

describe('coordinates projection', () => {
  it('projects RA=0, Dec=0 to the left centre', () => {
    const p = projectToPlane(0, 0)
    expect(p.x).toBeCloseTo(-PLANE_WIDTH / 2)
    expect(p.y).toBeCloseTo(0)
  })

  it('projects RA=180, Dec=0 to the centre', () => {
    const p = projectToPlane(180, 0)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
  })

  it('projects RA=360, Dec=90 to the top-right (north up)', () => {
    const p = projectToPlane(360, 90)
    expect(p.x).toBeCloseTo(PLANE_WIDTH / 2)
    expect(p.y).toBeCloseTo(-PLANE_HEIGHT / 2)
  })

  it('is deterministic', () => {
    expect(projectToPlane(123.45, -12.34)).toEqual(projectToPlane(123.45, -12.34))
  })
})

describe('mock object positions', () => {
  it('every object projects within the plane bounds', () => {
    for (const o of provider.getObjects()) {
      expect(Math.abs(o.visualPosition.x)).toBeLessThanOrEqual(PLANE_WIDTH / 2 + 1)
      expect(Math.abs(o.visualPosition.y)).toBeLessThanOrEqual(PLANE_HEIGHT / 2 + 1)
    }
  })

  it('objects of every type are placed on the map', () => {
    for (const type of OBJECT_TYPES) {
      const objs = provider.getObjectsByType(type)
      expect(objs.length).toBeGreaterThan(0)
      for (const o of objs) {
        expect(o.animationType).toBe(type)
      }
    }
  })

  it('positions are spread across the field (not all clustered)', () => {
    const xs = provider.getObjects().map((o) => o.visualPosition.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    expect(maxX - minX).toBeGreaterThan(PLANE_WIDTH * 0.6)
  })
})
