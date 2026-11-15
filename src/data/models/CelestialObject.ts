import type { AnimationType, ObjectType } from './ObjectType'

export interface CelestialObject {
  id: string
  name: string
  objectType: ObjectType
  rightAscension: number
  declination: number
  visualPosition: { x: number; y: number }
  description: string
  animationType: AnimationType
  observationIds: string[]
}
