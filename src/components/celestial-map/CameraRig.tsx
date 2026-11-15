import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMapStore } from '../../store/mapStore'

interface ControlsLike {
  target: THREE.Vector3
  object: THREE.Camera
  update: () => void
  enabled: boolean
}

const FOCUS_DISTANCE = 150
const LERP = 0.1
const DURATION = 1.2

export function CameraRig() {
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null
  const focusTarget = useMapStore((s) => s.focusTarget)
  const clearFocus = useMapStore((s) => s.clearFocus)
  const markNavReady = useMapStore((s) => s.markNavReady)
  const saveCamera = useMapStore((s) => s.saveCamera)
  const lerp = useRef({ active: false, tx: 0, ty: 0, t: 0 })
  const wasFocusing = useRef(false)

  useEffect(() => {
    const focusing = !!focusTarget
    if (focusing && !wasFocusing.current && controls) {
      saveCamera({
        targetX: controls.target.x,
        targetY: controls.target.y,
        distance: controls.object.position.z,
      })
    }
    wasFocusing.current = focusing
    if (focusing && controls) {
      lerp.current = { active: true, tx: focusTarget.x, ty: focusTarget.y, t: 0 }
      controls.enabled = false
    }
  }, [focusTarget, controls, saveCamera])

  useFrame((_, dt) => {
    const ls = lerp.current
    if (!ls.active || !controls) return
    const cam = controls.object
    controls.target.x = THREE.MathUtils.lerp(controls.target.x, ls.tx, LERP)
    controls.target.y = THREE.MathUtils.lerp(controls.target.y, ls.ty, LERP)
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, ls.tx, LERP)
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, ls.ty, LERP)
    cam.position.z = THREE.MathUtils.lerp(cam.position.z, FOCUS_DISTANCE, LERP)
    controls.update()
    ls.t += dt
    if (ls.t > DURATION) {
      ls.active = false
      controls.enabled = true
      clearFocus()
      markNavReady()
    }
  })

  return null
}
