import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDataProvider } from '../../data/providers/DataContext'
import { useMapStore } from '../../store/mapStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { TYPE_ANIMATIONS } from '../../animations/objectAnimations'
import { artFor, mapSizeFor } from '../../animations/objectArt'

// Selection feedback: four thin corner brackets that tighten around the object, like a
// target lock. No circle and no glow, so the object itself stays the focus.
export function SelectedRing() {
  const selectedId = useMapStore((s) => s.selectedObjectId)
  const provider = useDataProvider()
  const reduced = useReducedMotion()
  const obj = selectedId ? provider.getObjectById(selectedId) : undefined
  const ref = useRef<THREE.LineSegments>(null)
  const startRef = useRef<number | null>(null)

  const geometry = useMemo(() => {
    const arm = 0.38
    const pts: number[] = []
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        pts.push(sx * (1 - arm), sy, 0, sx, sy, 0)
        pts.push(sx, sy, 0, sx, sy * (1 - arm), 0)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => {
    startRef.current = null
  }, [selectedId])

  useFrame((state) => {
    if (!ref.current || !obj) return
    const size = artFor(obj.id) ? mapSizeFor(obj.objectType, obj.id) * 0.75 : TYPE_ANIMATIONS[obj.objectType].baseSize * 1.5
    if (reduced) {
      ref.current.scale.setScalar(size)
      return
    }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime
    const t = Math.min(1, (state.clock.elapsedTime - startRef.current) / 0.6)
    const eased = 1 - Math.pow(1 - t, 3)
    ref.current.scale.setScalar(size * (1.8 - 0.8 * eased))
  })

  if (!obj) return null

  return (
    <lineSegments ref={ref} geometry={geometry} position={[obj.visualPosition.x, obj.visualPosition.y, 0.5]}>
      <lineBasicMaterial color="#c9b6e8" transparent opacity={0.6} depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
}
