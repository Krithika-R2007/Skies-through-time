export const PLANE_WIDTH = 2400
export const PLANE_HEIGHT = 1200

export interface PlanePosition {
  x: number
  y: number
}

export function projectToPlane(rightAscension: number, declination: number): PlanePosition {
  const x = (rightAscension / 360 - 0.5) * PLANE_WIDTH
  const y = -(declination / 90) * (PLANE_HEIGHT / 2)
  return { x, y }
}
