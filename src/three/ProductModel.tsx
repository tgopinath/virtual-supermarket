import { memo, useMemo } from 'react'
import * as THREE from 'three'
import type { Product } from '../data/products'

// Low-poly procedural product models: no external assets, cheap to render, and
// each one keeps a recognisable silhouette. `detail` lowers segment counts (LOD).

let barcodeTex: THREE.CanvasTexture | null = null
export function barcodeTexture() {
  if (barcodeTex) return barcodeTex
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 128, 64)
  g.fillStyle = '#111'
  let x = 8
  let seed = 7
  while (x < 120) {
    seed = (seed * 9301 + 49297) % 233280
    const w = 1 + (seed % 4)
    g.fillRect(x, 6, w, 44)
    x += w + 1 + (seed % 3)
  }
  g.font = '10px monospace'
  g.fillText('8 901234 567890', 14, 61)
  barcodeTex = new THREE.CanvasTexture(c)
  barcodeTex.colorSpace = THREE.SRGBColorSpace
  return barcodeTex
}

function Barcode({ position, rotation, w = 0.06 }: { position: [number, number, number]; rotation?: [number, number, number]; w?: number }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, w / 2]} />
      <meshBasicMaterial map={barcodeTexture()} toneMapped={false} />
    </mesh>
  )
}

const Mat = ({ color, rough = 0.6, metal = 0, emissive }: { color: string; rough?: number; metal?: number; emissive?: string }) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.35 : 0} />
)

interface Props {
  product: Product
  detail?: number
  highlight?: boolean
}

export const ProductModel = memo(function ProductModel({ product, detail = 16, highlight = false }: Props) {
  const { shape, color, accent = '#ffffff', size: s } = product.model
  const glow = highlight ? '#ffffff' : undefined
  const seg = detail
  const leaf = '#2e7d32'

  const grapes = useMemo(() => {
    const pts: Array<[number, number, number]> = []
    for (let row = 0; row < 5; row++) {
      const n = 5 - row
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + row
        pts.push([Math.cos(a) * 0.012 * n, s * 0.75 - row * s * 0.15, Math.sin(a) * 0.012 * n])
      }
    }
    return pts
  }, [s])

  switch (shape) {
    case 'sphere':
      return (
        <group>
          <mesh castShadow position={[0, s / 2, 0]}><sphereGeometry args={[s / 2, seg, seg]} /><Mat color={color} rough={0.35} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.98, 0]}><cylinderGeometry args={[0.004, 0.004, s * 0.18, 5]} /><Mat color={product.model.accent ?? '#5d4037'} /></mesh>
        </group>
      )
    case 'onion':
      return (
        <group>
          <mesh castShadow position={[0, s / 2, 0]} scale={[1, 0.9, 1]}><sphereGeometry args={[s / 2, seg, seg]} /><Mat color={color} rough={0.4} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.95, 0]}><coneGeometry args={[s * 0.12, s * 0.3, 6]} /><Mat color="#c48b9f" /></mesh>
        </group>
      )
    case 'mango':
      return (
        <group rotation={[0, 0, 0.3]}>
          <mesh castShadow position={[0, s * 0.4, 0]} scale={[0.75, 1, 0.6]}><sphereGeometry args={[s / 2, seg, seg]} /><Mat color={color} rough={0.3} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.9, 0]}><sphereGeometry args={[s * 0.12, 6, 6]} /><Mat color={accent} /></mesh>
        </group>
      )
    case 'banana':
      return (
        <group rotation={[0, 0, Math.PI / 2]} position={[0, 0.03, 0]}>
          <mesh castShadow><torusGeometry args={[s * 0.5, s * 0.12, 8, seg, Math.PI * 0.8]} /><Mat color={color} rough={0.5} emissive={glow} /></mesh>
        </group>
      )
    case 'grapes':
      return (
        <group>
          {grapes.map((p, i) => (
            <mesh key={i} position={p} castShadow><sphereGeometry args={[0.017, 8, 8]} /><Mat color={color} rough={0.25} emissive={glow} /></mesh>
          ))}
          <mesh position={[0, s * 0.92, 0]}><cylinderGeometry args={[0.003, 0.003, 0.04, 4]} /><Mat color={leaf} /></mesh>
        </group>
      )
    case 'carrot':
      return (
        <group rotation={[0, 0, Math.PI / 2.4]} position={[0, 0.03, 0]}>
          <mesh castShadow rotation={[Math.PI, 0, 0]}><coneGeometry args={[s * 0.16, s, seg]} /><Mat color={color} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.6, 0]}><coneGeometry args={[s * 0.1, s * 0.3, 5]} /><Mat color={accent} /></mesh>
        </group>
      )
    case 'cabbage':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.45, 0]}><icosahedronGeometry args={[s / 2, 1]} /><Mat color={color} rough={0.7} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.45, 0]} scale={1.04}><icosahedronGeometry args={[s / 2, 0]} /><meshStandardMaterial color="#689f38" wireframe /></mesh>
        </group>
      )
    case 'coconut':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.45, 0]} scale={[1, 1.1, 1]}><sphereGeometry args={[s / 2, seg, seg]} /><Mat color={color} rough={0.8} emissive={glow} /></mesh>
          <mesh position={[0, s * 1.0, 0]}><cylinderGeometry args={[0.004, 0.004, 0.08, 4]} /><Mat color="#fff" /></mesh>
        </group>
      )
    case 'bottle':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.35, 0]}><cylinderGeometry args={[s * 0.2, s * 0.2, s * 0.7, seg]} /><meshPhysicalMaterial color={color} roughness={0.15} transmission={0.2} emissive={glow ?? '#000'} emissiveIntensity={glow ? 0.35 : 0} /></mesh>
          <mesh position={[0, s * 0.32, 0]}><cylinderGeometry args={[s * 0.205, s * 0.205, s * 0.28, seg]} /><Mat color={accent} /></mesh>
          <mesh position={[0, s * 0.8, 0]}><cylinderGeometry args={[s * 0.07, s * 0.18, s * 0.2, seg]} /><Mat color={color} rough={0.2} /></mesh>
          <mesh position={[0, s * 0.95, 0]}><cylinderGeometry args={[s * 0.08, s * 0.08, s * 0.1, seg]} /><Mat color={accent} /></mesh>
          <Barcode position={[0, s * 0.12, s * 0.205]} w={s * 0.25} />
        </group>
      )
    case 'carton':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.4, 0]}><boxGeometry args={[s * 0.4, s * 0.8, s * 0.4]} /><Mat color={color} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.45, 0]}><boxGeometry args={[s * 0.41, s * 0.25, s * 0.41]} /><Mat color={accent} /></mesh>
          <mesh position={[0, s * 0.88, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[s * 0.29, s * 0.16, 4]} /><Mat color={color} /></mesh>
          <Barcode position={[0, s * 0.15, s * 0.205]} w={s * 0.3} />
        </group>
      )
    case 'box':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.35, 0]}><boxGeometry args={[s * 0.9, s * 0.7, s * 0.35]} /><Mat color={color} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.45, s * 0.176]}><planeGeometry args={[s * 0.7, s * 0.25]} /><Mat color={accent} /></mesh>
          <Barcode position={[s * 0.22, s * 0.12, s * 0.177]} w={s * 0.3} />
        </group>
      )
    case 'bar':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.12, 0]}><boxGeometry args={[s, s * 0.24, s * 0.45]} /><Mat color={color} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.12, s * 0.226]}><planeGeometry args={[s * 0.5, s * 0.16]} /><Mat color={accent} /></mesh>
          <Barcode position={[s * 0.33, s * 0.12, s * 0.227]} w={s * 0.25} />
        </group>
      )
    case 'bag':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.42, 0]} scale={[1, 1, 0.45]}><capsuleGeometry args={[s * 0.3, s * 0.3, 4, seg]} /><Mat color={color} rough={0.4} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.45, s * 0.14]}><planeGeometry args={[s * 0.4, s * 0.25]} /><Mat color={accent} /></mesh>
          <Barcode position={[0, s * 0.22, s * 0.13]} w={s * 0.22} />
        </group>
      )
    case 'tub':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.35, 0]}><cylinderGeometry args={[s * 0.5, s * 0.4, s * 0.7, seg]} /><Mat color={color} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.72, 0]}><cylinderGeometry args={[s * 0.52, s * 0.52, s * 0.06, seg]} /><Mat color={accent} /></mesh>
          <Barcode position={[0, s * 0.3, s * 0.46]} w={s * 0.3} />
        </group>
      )
    case 'tube':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.12, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.6]}><capsuleGeometry args={[s * 0.12, s * 0.7, 4, seg]} /><Mat color={color} emissive={glow} /></mesh>
          <mesh position={[s * 0.5, s * 0.12, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[s * 0.07, s * 0.07, s * 0.08, 8]} /><Mat color={accent} /></mesh>
          <Barcode position={[-s * 0.15, s * 0.12, s * 0.075]} w={s * 0.25} />
        </group>
      )
    case 'loaf':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.2, 0]}><boxGeometry args={[s, s * 0.4, s * 0.45]} /><meshPhysicalMaterial color={accent} transparent opacity={0.55} roughness={0.1} /></mesh>
          <mesh position={[0, s * 0.19, 0]}><boxGeometry args={[s * 0.94, s * 0.36, s * 0.4]} /><Mat color={color} emissive={glow} /></mesh>
          <Barcode position={[s * 0.32, s * 0.1, s * 0.226]} w={s * 0.2} />
        </group>
      )
    case 'cake':
      return (
        <group>
          <mesh castShadow position={[0, s * 0.15, 0]}><cylinderGeometry args={[s * 0.5, s * 0.5, s * 0.3, seg]} /><Mat color={accent} emissive={glow} /></mesh>
          <mesh position={[0, s * 0.32, 0]}><cylinderGeometry args={[s * 0.51, s * 0.51, s * 0.06, seg]} /><Mat color={color} rough={0.3} /></mesh>
          <mesh position={[0, s * 0.4, 0]}><sphereGeometry args={[s * 0.07, 8, 8]} /><Mat color="#d32f2f" rough={0.2} /></mesh>
        </group>
      )
    case 'bun':
      return <mesh castShadow position={[0, s * 0.25, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[s / 2, seg, seg]} /><Mat color={color} rough={0.5} emissive={glow} /></mesh>
    case 'croissant':
      return (
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <mesh castShadow><torusGeometry args={[s * 0.32, s * 0.15, 8, seg, Math.PI * 1.1]} /><Mat color={color} rough={0.45} emissive={glow} /></mesh>
        </group>
      )
    case 'jar':
    default:
      return <mesh castShadow position={[0, s * 0.4, 0]}><cylinderGeometry args={[s * 0.3, s * 0.3, s * 0.8, seg]} /><Mat color={color} emissive={glow} /></mesh>
  }
})
