import { MapControls } from '@react-three/drei'

export function CameraController() {
  return (
    <MapControls
      makeDefault
      enableRotate={false}
      enablePan
      screenSpacePanning
      zoomToCursor
      enableDamping
      dampingFactor={0.08}
      panSpeed={0.8}
      minDistance={80}
      maxDistance={2600}
    />
  )
}
