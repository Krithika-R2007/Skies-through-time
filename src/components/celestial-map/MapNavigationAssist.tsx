import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMapStore } from '../../store/mapStore'
import { PLANE_HEIGHT, PLANE_WIDTH } from '../../utils/coordinates'

interface ControlsLike {
  target: THREE.Vector3
  object: THREE.Camera
  update: () => void
  enabled: boolean
}

const MARGIN = 150
const HOME_DISTANCE = 1400
const INTRO_START_DISTANCE = 2300
const MIN_DOUBLE_CLICK_DISTANCE = 120

// Three navigation refinements for the map:
//  1. A slow arrival: on first load the camera drifts in from far away.
//  2. Double-click zoom: glides toward the clicked point and halves the distance.
//  3. Pan limits: the view can't drift endlessly into empty space.
export function MapNavigationAssist() {
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const anim = useRef({ active: false, tx: 0, ty: 0, tz: HOME_DISTANCE, k: 0.1 })

  // Arrival animation (first visit this session, and only when there's no saved view).
  useEffect(() => {
    if (!controls) return
    const s = useMapStore.getState()
    if (s.introPlayed) return
    s.markIntroPlayed()
    if (!s.savedCamera) {
      camera.position.z = INTRO_START_DISTANCE
      controls.update()
      anim.current = { active: true, tx: 0, ty: 0, tz: HOME_DISTANCE, k: 0.035 }
    }
  }, [controls, camera])

  // Double-click zoom + cancel any glide when the user takes over.
  useEffect(() => {
    const el = gl.domElement
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const ray = new THREE.Raycaster()
    const hit = new THREE.Vector3()

    const onDouble = (e: MouseEvent) => {
      const st = useMapStore.getState()
      if (st.hoverObjectId || st.focusTarget) return // a double-click on an object selects it
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      ray.setFromCamera(ndc, camera)
      if (!ray.ray.intersectPlane(plane, hit)) return
      anim.current = {
        active: true,
        tx: hit.x,
        ty: hit.y,
        tz: Math.max(MIN_DOUBLE_CLICK_DISTANCE, camera.position.z * 0.5),
        k: 0.1,
      }
    }
    const cancel = () => {
      anim.current.active = false
    }

    el.addEventListener('dblclick', onDouble)
    el.addEventListener('pointerdown', cancel)
    el.addEventListener('wheel', cancel, { passive: true })
    return () => {
      el.removeEventListener('dblclick', onDouble)
      el.removeEventListener('pointerdown', cancel)
      el.removeEventListener('wheel', cancel)
    }
  }, [gl, camera])

  useFrame(() => {
    if (!controls) return
    const a = anim.current

    if (a.active) {
      if (!controls.enabled) {
        a.active = false // the selection dolly took over
      } else {
        controls.target.x = THREE.MathUtils.lerp(controls.target.x, a.tx, a.k)
        controls.target.y = THREE.MathUtils.lerp(controls.target.y, a.ty, a.k)
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, a.tx, a.k)
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, a.ty, a.k)
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, a.tz, a.k)
        controls.update()
        if (
          Math.abs(camera.position.z - a.tz) < 1 &&
          Math.abs(controls.target.x - a.tx) < 0.5 &&
          Math.abs(controls.target.y - a.ty) < 0.5
        ) {
          a.active = false
        }
      }
    }

    // Keep the view over the sky.
    const lx = PLANE_WIDTH / 2 + MARGIN
    const ly = PLANE_HEIGHT / 2 + MARGIN
    const t = controls.target
    const cx = Math.max(-lx, Math.min(lx, t.x))
    const cy = Math.max(-ly, Math.min(ly, t.y))
    if (cx !== t.x || cy !== t.y) {
      camera.position.x += cx - t.x
      camera.position.y += cy - t.y
      t.x = cx
      t.y = cy
    }
  })

  return null
}
