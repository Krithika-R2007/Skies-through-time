import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFilterStore } from '../../store/filterStore'
import { useBackendStore } from '../../store/backendStore'
import { getHealpix } from '../../data/api/endpoints'
import { projectToPlane } from '../../utils/coordinates'

// SPHEREx survey tiles from the backend's HEALPix endpoint, drawn as faint points
// behind the objects. Only requested when the user turns the layer on.
export function CoverageLayer() {
  const show = useFilterStore((s) => s.showCoverage)
  const online = useBackendStore((s) => s.status === 'online')
  const [positions, setPositions] = useState<Float32Array | null>(null)

  useEffect(() => {
    if (!show || !online || positions) return
    const ctrl = new AbortController()
    getHealpix(32, { signal: ctrl.signal })
      .then((c) => {
        const arr = new Float32Array(c.ra_centres.length * 3)
        c.ra_centres.forEach((ra, i) => {
          const p = projectToPlane(ra, c.dec_centres[i])
          arr[i * 3] = p.x
          arr[i * 3 + 1] = p.y
          arr[i * 3 + 2] = -4
        })
        setPositions(arr)
      })
      .catch(() => {
        /* layer simply stays empty */
      })
    return () => ctrl.abort()
  }, [show, online, positions])

  const geometry = useMemo(() => {
    if (!positions) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])
  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!show || !geometry) return null
  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={5} sizeAttenuation transparent opacity={0.28} color="#5ad9e6" depthWrite={false} toneMapped={false} />
    </points>
  )
}
