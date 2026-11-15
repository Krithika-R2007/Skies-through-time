import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useDataProvider } from '../../data/providers/DataContext'
import { useMapStore, type LabelPos } from '../../store/mapStore'
import { MAX_LABELS, shouldShowLabels } from '../../utils/labelBuckets'

export function LabelProjector() {
  const camera = useThree((s) => s.camera)
  const provider = useDataProvider()
  const setLabels = useMapStore((s) => s.setLabels)
  const objects = useMemo(() => provider.getObjects(), [provider])
  const v = useMemo(() => new THREE.Vector3(), [])
  const frame = useRef(0)

  useFrame(() => {
    frame.current++
    if (frame.current % 6 !== 0) return

    if (!shouldShowLabels(camera.position.z)) {
      setLabels([])
      return
    }

    const eligible: LabelPos[] = []
    for (const o of objects) {
      v.set(o.visualPosition.x, o.visualPosition.y, 0)
      v.project(camera)
      if (v.z > 1) continue
      if (v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) continue
      eligible.push({
        id: o.id,
        name: o.name,
        leftPct: ((v.x + 1) / 2) * 100,
        topPct: ((-v.y + 1) / 2) * 100,
      })
    }

    eligible.sort((a, b) => {
      const da = (a.leftPct - 50) ** 2 + (a.topPct - 50) ** 2
      const db = (b.leftPct - 50) ** 2 + (b.topPct - 50) ** 2
      return da - db
    })
    setLabels(eligible.slice(0, MAX_LABELS))
  })

  return null
}
