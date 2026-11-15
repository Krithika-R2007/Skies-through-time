import { Canvas } from '@react-three/fiber'
import { ObjectField } from './ObjectField'
import { CameraController } from './CameraController'
import { CameraRig } from './CameraRig'
import { CameraPersister } from './CameraPersister'
import { MapNavigationAssist } from './MapNavigationAssist'
import { BackgroundStars } from './BackgroundStars'
import { LabelProjector } from './LabelProjector'
import { SelectedRing } from './SelectedRing'
import { CoverageLayer } from './CoverageLayer'
import { MapScenery } from './MapScenery'

export function CelestialMap() {
  return (
    <Canvas
      camera={{ position: [0, 0, 1400], fov: 50, near: 1, far: 8000 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ background: 'transparent', touchAction: 'none' }}
    >
      <CameraController />
      <CameraRig />
      <CameraPersister />
      <MapNavigationAssist />
      <BackgroundStars />
      <MapScenery />
      <CoverageLayer />
      <SelectedRing />
      <ObjectField />
      <LabelProjector />
    </Canvas>
  )
}
