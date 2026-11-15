import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { PLANET_ORBITS, ZONES } from '../../utils/mapLayout'
import { afterIntro, introEase } from '../../utils/intro'

const RING_OPACITY = 0.06

// Faint context drawn behind the objects: the planets' orbits around the Sun and a title
// for each region of the map.
export function MapScenery() {
  const solar = ZONES[0]
  const rings = useMemo(
    () =>
      PLANET_ORBITS.map((r) => {
        const pts: number[] = []
        for (let i = 0; i < 128; i++) {
          const a = (i / 128) * Math.PI * 2
          pts.push(solar.centre.x + Math.cos(a) * r, solar.centre.y + Math.sin(a) * r * 0.92, -2)
        }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
        return g
      }),
    [solar],
  )
  useEffect(() => () => rings.forEach((g) => g.dispose()), [rings])
  const group = useRef<THREE.Group>(null)
  // Orbits fade in as the objects settle; region titles wait until the opening title has gone.
  useFrame(() => {
    const g = group.current
    if (!g) return
    const e = introEase()
    const late = afterIntro()
    g.children.forEach((child) => {
      const line = child as THREE.LineLoop
      if (line.isLineLoop) (line.material as THREE.LineBasicMaterial).opacity = RING_OPACITY * e
    })
    document.querySelectorAll<HTMLElement>('[data-zone-title]').forEach((el) => { el.style.opacity = String(late) })
  })
  return (
    <group ref={group}>
      {rings.map((g, i) => (
        <lineLoop key={i} geometry={g}>
          <lineBasicMaterial color="#5ad9e6" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </lineLoop>
      ))}
      {ZONES.map((z) => (
        <Html key={z.id} position={[z.centre.x, 570, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div data-zone-title className="select-none whitespace-nowrap text-center" style={{ opacity: 0 }}>
            <p className="font-heading text-xs uppercase tracking-[0.5em] text-cyan/55">{z.title}</p>
            <p className="mt-1 font-body text-[10px] tracking-wider text-lavender/15">{z.subtitle}</p>
          </div>
        </Html>
      ))}
    </group>
  )
}