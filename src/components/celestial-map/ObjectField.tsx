import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useDataProvider } from '../../data/providers/DataContext'
import { OBJECT_TYPES } from '../../data/models'
import type { CelestialObject, ObjectType } from '../../data/models'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { createTypeSprites, disposeSprites } from '../../utils/proceduralTexture'
import { TYPE_ANIMATIONS, instanceMetaFor } from '../../animations/objectAnimations'
import { useMapStore } from '../../store/mapStore'
import { useFilterStore } from '../../store/filterStore'
import { playSound } from '../../utils/sound'
import { INTRO_START_SCALE, introEase, lerp, scatterOf } from '../../utils/intro'
import { artFor, mapSizeFor } from '../../animations/objectArt'
import type { ObjectArt } from '../../animations/objectArt'

const SOLID_TYPES: ObjectType[] = ['planet', 'dwarfPlanet', 'asteroid']

interface InstancedTypeProps {
  type: ObjectType
  objects: CelestialObject[]
  sprites: Record<ObjectType, THREE.Texture>
}

function InstancedType({ type, objects, sprites }: InstancedTypeProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const baseSize = TYPE_ANIMATIONS[type].baseSize
  const hoverId = useMapStore((s) => s.hoverObjectId)
  const selectedId = useMapStore((s) => s.selectedObjectId)
  const setHover = useMapStore((s) => s.setHover)
  const select = useMapStore((s) => s.select)

  const meta = useMemo(
    () => objects.map((o) => instanceMetaFor(type, o.id, baseSize)),
    [objects, type, baseSize],
  )

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: sprites[type],
        transparent: true,
        depthWrite: false,
        blending: SOLID_TYPES.includes(type) ? THREE.NormalBlending : THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [sprites, type],
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    objects.forEach((_, i) => {
      mesh.setColorAt(i, meta[i].tint)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [objects, meta])

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId == null) return
    const id = objects[e.instanceId].id
    if (useMapStore.getState().hoverObjectId !== id) {
      setHover(id)
      playSound('tick')
    }
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    setHover(null)
    document.body.style.cursor = ''
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId == null) return
    e.stopPropagation()
    select(objects[e.instanceId])
  }

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    const e = introEase()
    for (let i = 0; i < objects.length; i++) {
      const o = objects[i]
      const m = meta[i]
      const from = scatterOf(o.id)
      dummy.position.set(lerp(from.x, o.visualPosition.x, e), lerp(from.y, o.visualPosition.y, e), 0)
      let sx = m.baseScale
      let sy = m.baseScale
      if (type === 'galaxy') {
        sx = m.baseScale * 0.45
        sy = m.baseScale
      }
      if (!reduced) {
        if (type === 'star' || type === 'brownDwarf' || type === 'galaxy') {
          const pulse = 1 + 0.13 * Math.sin(t * m.speed + m.phase)
          sx *= pulse
          sy *= pulse
        } else if (type === 'comet') {
          sy *= 1 + 0.09 * Math.sin(t * m.speed + m.phase)
          dummy.rotation.z = m.dir + 0.06 * Math.sin(t * 0.3 + m.phase)
        } else if (type === 'asteroid') {
          dummy.rotation.z = m.dir + t * 0.05
        } else if (type === 'planet' || type === 'dwarfPlanet') {
          const pulse = 1 + 0.03 * Math.sin(t * m.speed + m.phase)
          sx *= pulse
          sy *= pulse
        }
      } else if (type === 'comet' || type === 'asteroid') {
        dummy.rotation.z = m.dir
      }

      const isHover = hoverId === o.id
      const isSel = selectedId === o.id
      const boost = isHover && !isSel ? 1.25 : 1
      sx *= boost
      sy *= boost

      const grow = lerp(INTRO_START_SCALE, 1, e)
      dummy.scale.set(sx * grow, sy * grow, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (objects.length === 0) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, objects.length]}
      frustumCulled={false}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  )
}

// --- Pictures on the map -------------------------------------------------------
// Objects with artwork are drawn as their own picture. Images are shrunk to small
// textures once, so ~50 objects stay light on the GPU.
const TEX_MAX = 256
const texCache = new Map<string, Promise<{ tex: THREE.CanvasTexture; aspect: number }>>()

function loadArtTexture(art: ObjectArt) {
  let p = texCache.get(art.src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight
        const w = aspect >= 1 ? TEX_MAX : Math.round(TEX_MAX * aspect)
        const h = aspect >= 1 ? Math.round(TEX_MAX / aspect) : TEX_MAX
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        if (art.mask && art.mask !== 'none') {
          // Fade the picture's edges so square photos blend into the sky.
          ctx.globalCompositeOperation = 'destination-in'
          ctx.save()
          ctx.translate(w / 2, h / 2)
          ctx.scale(w / 2, h / 2)
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
          g.addColorStop(art.mask === 'round' ? 0.86 : 0.6, 'rgba(0,0,0,1)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(-1, -1, 2, 2)
          ctx.restore()
        }
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 4
        resolve({ tex, aspect })
      }
      img.onerror = () => reject(new Error(`Could not load ${art.src}`))
      img.src = art.src
    })
    texCache.set(art.src, p)
  }
  return p
}

function ArtSprite({ object, art, order }: { object: CelestialObject; art: ObjectArt; order: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const reduced = useReducedMotion()
  const [loaded, setLoaded] = useState<{ tex: THREE.CanvasTexture; aspect: number } | null>(null)
  const hoverId = useMapStore((s) => s.hoverObjectId)
  const selectedId = useMapStore((s) => s.selectedObjectId)
  const setHover = useMapStore((s) => s.setHover)
  const select = useMapStore((s) => s.select)
  const meta = useMemo(() => instanceMetaFor(object.objectType, object.id, 1), [object])

  useEffect(() => {
    let alive = true
    loadArtTexture(art).then((l) => alive && setLoaded(l)).catch(() => {})
    return () => {
      alive = false
    }
  }, [art])

  const size = mapSizeFor(object.objectType, object.id)
  const w = loaded ? (loaded.aspect >= 1 ? size : size * loaded.aspect) : size
  const h = loaded ? (loaded.aspect >= 1 ? size / loaded.aspect : size) : size
  const isHover = hoverId === object.id
  const isSel = selectedId === object.id

  useFrame((state) => {
    const m = meshRef.current
    if (!m) return
    const t = state.clock.elapsedTime
    const e = introEase()
    const from = scatterOf(object.id)
    m.position.set(lerp(from.x, object.visualPosition.x, e), lerp(from.y, object.visualPosition.y, e), order * 0.01)
    const boost = isHover && !isSel ? 1.18 : 1
    let s = boost * lerp(INTRO_START_SCALE, 1, e)
    if (!reduced) {
      s *= 1 + 0.025 * Math.sin(t * meta.speed + meta.phase)
      m.rotation.z = art.motion === 'rock' ? t * 0.04 + meta.dir : 0.03 * Math.sin(t * 0.4 + meta.phase)
    }
    m.scale.set(w * s, h * s, 1)
  })

  if (!loaded) return null
  return (
    <mesh
      ref={meshRef}
      renderOrder={order}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (useMapStore.getState().hoverObjectId !== object.id) {
          setHover(object.id)
          playSound('tick')
        }
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (useMapStore.getState().hoverObjectId === object.id) setHover(null)
        document.body.style.cursor = ''
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        select(object)
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={loaded.tex}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={art.kind === 'screen' ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  )
}
export function ObjectField() {
  const provider = useDataProvider()
  const sprites = useMemo(() => createTypeSprites(), [])
  useEffect(() => () => disposeSprites(sprites), [sprites])
  const activeTypes = useFilterStore((s) => s.activeTypes)

  const grouped = useMemo(() => {
    const map = Object.fromEntries(
      OBJECT_TYPES.map((t) => [t, [] as CelestialObject[]]),
    ) as Record<ObjectType, CelestialObject[]>
    for (const o of provider.getObjects()) if (!artFor(o.id)) map[o.objectType].push(o)
    return map
  }, [provider])
  const withArt = useMemo(() => provider.getObjects().filter((o) => artFor(o.id)), [provider])

  const visibleTypes =
    activeTypes.length === 0 ? OBJECT_TYPES : OBJECT_TYPES.filter((t) => activeTypes.includes(t))

  return (
    <group>
      {withArt
        .filter((o) => visibleTypes.includes(o.objectType))
        .map((o, i) => (
          <ArtSprite key={o.id} object={o} art={artFor(o.id)!} order={i + 1} />
        ))}
      {visibleTypes.map((type) =>
        grouped[type].length > 0 ? (
          <InstancedType key={type} type={type} objects={grouped[type]} sprites={sprites} />
        ) : null,
      )}
    </group>
  )
}
