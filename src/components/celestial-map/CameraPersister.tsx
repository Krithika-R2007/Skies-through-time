import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useMapStore } from '../../store/mapStore'

interface ControlsLike {
  target: { set: (x: number, y: number, z: number) => void }
  object: { position: { set: (x: number, y: number, z: number) => void } }
  update: () => void
}

export function CameraPersister() {
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null

  useEffect(() => {
    if (!controls) return
    const saved = useMapStore.getState().savedCamera
    if (saved) {
      controls.target.set(saved.targetX, saved.targetY, 0)
      controls.object.position.set(saved.targetX, saved.targetY, saved.distance)
      controls.update()
    }
  }, [controls])

  return null
}
