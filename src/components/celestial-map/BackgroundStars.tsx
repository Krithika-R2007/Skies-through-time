import { useMemo } from 'react'
import { createRng } from '../../data/mock/prng'

export function BackgroundStars({ count = 1400 }: { count?: number }) {
  const positions = useMemo(() => {
    const rng = createRng(98765)
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rng() - 0.5) * 4200
      arr[i * 3 + 1] = (rng() - 0.5) * 4200
      arr[i * 3 + 2] = -1200 - rng() * 1800
    }
    return arr
  }, [count])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={3} sizeAttenuation transparent opacity={0.5} color="#c9b6e8" depthWrite={false} />
    </points>
  )
}
