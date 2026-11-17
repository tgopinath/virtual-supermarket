import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { memo, useEffect, useState } from 'react'
import { departmentOf } from '../data/products'
import { useProgress } from '../store/progressStore'
import { useSession } from '../store/sessionStore'
import { press, setCameraEnabled } from './interaction'
import { DISPLAY_SCALE, SHELF_LEVELS, shelfSlots, type ShelfLayout, type Slot } from './layout'
import { ProductModel } from './ProductModel'

/** Most copies of one product shown side by side, per graphics quality (simple LOD). */
const qualityCopies = { low: 2, medium: 5, high: 8 } as const
const qualityDetail = { low: 8, medium: 14, high: 22 } as const

function ShelfProduct({ slot, copies, detail, onPick }: { slot: Slot; copies: number; detail: number; onPick?: (id: string) => void }) {
  const [hover, setHover] = useState(false)
  const selected = useSession((s) => s.selected === slot.product.id)
  const inXR = useXR((s) => s.mode !== null)
  const { product } = slot
  const step = product.model.size * DISPLAY_SCALE * 1.1
  const n = Math.max(1, Math.min(copies, Math.floor((slot.slotWidth * 0.8) / step)))
  const spacing = step

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (inXR || onPick) return
    press.current = { id: product.id, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    setCameraEnabled(false)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const s = useSession.getState()
    if (s.dragging) return
    if (onPick) return onPick(product.id)
    // In VR/AR a trigger press picks the product straight into the trolley.
    if (inXR) s.addToCart(product.id)
    else s.select(product.id)
  }

  return (
    <group position={[slot.x, slot.y, 0.05]}>
      <group
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'grab' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
        onPointerDown={onDown}
        onClick={onClick}
        scale={hover || selected ? 1.12 : 1}
      >
        {Array.from({ length: n }, (_, i) => (
          <group key={i} position={[(i - (n - 1) / 2) * spacing, 0, (i % 2) * -0.06]}>
            <group scale={DISPLAY_SCALE}><ProductModel product={product} detail={detail} highlight={hover || selected} /></group>
          </group>
        ))}
        {/* generous invisible hit box so small items are easy for small fingers */}
        <mesh position={[0, 0.2, 0]} visible={false}>
          <boxGeometry args={[Math.max(slot.slotWidth * 0.9, 0.3), 0.45, 0.45]} />
        </mesh>
      </group>
      <PriceTag name={product.name} price={product.price} unit={product.unit} highlight={hover || selected} />
    </group>
  )
}

const PriceTag = memo(function PriceTag({ name, price, unit, highlight }: { name: string; price: number; unit: string; highlight: boolean }) {
  return (
    <group position={[0, -0.035, 0.24]}>
      <mesh>
        <planeGeometry args={[0.36, 0.085]} />
        <meshBasicMaterial color={highlight ? '#fff59d' : '#ffffff'} toneMapped={false} />
      </mesh>
      <mesh position={[-0.135, 0, 0.001]}>
        <planeGeometry args={[0.09, 0.085]} />
        <meshBasicMaterial color="#e53935" toneMapped={false} />
      </mesh>
      <Text position={[-0.135, 0, 0.002]} fontSize={0.03} color="#fff" anchorX="center" anchorY="middle" fontWeight={700}>
        {`₹${price}`}
      </Text>
      <Text position={[-0.08, 0.012, 0.002]} fontSize={0.026} color="#1f2937" anchorX="left" anchorY="middle" maxWidth={0.24}>
        {name}
      </Text>
      <Text position={[-0.08, -0.022, 0.002]} fontSize={0.018} color="#6b7280" anchorX="left" anchorY="middle">
        {unit}
      </Text>
    </group>
  )
})

export function Shelf({ shelf, onPick }: { shelf: ShelfLayout; onPick?: (id: string) => void }) {
  const quality = useProgress((s) => s.settings.quality)
  const dept = departmentOf(shelf.id)
  const slots = shelfSlots(shelf)
  const depth = 0.55
  const isFridge = shelf.kind === 'fridge'
  const body = isFridge ? '#eceff1' : shelf.kind === 'produce' ? '#a1887f' : '#f5f5f5'

  return (
    <group position={[shelf.x, 0, shelf.z]}>
      {/* back panel & sides */}
      <mesh position={[0, 1.1, -depth / 2]} receiveShadow>
        <boxGeometry args={[shelf.width, 2.2, 0.05]} />
        <meshStandardMaterial color={isFridge ? '#cfd8dc' : dept.color} roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * shelf.width) / 2, 1.1, 0]} castShadow>
          <boxGeometry args={[0.06, 2.2, depth]} />
          <meshStandardMaterial color={body} />
        </mesh>
      ))}
      {/* shelf boards with coloured lips */}
      {SHELF_LEVELS.slice(1).map((y, i) => (
        <group key={i} position={[0, y - 0.02, 0]}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[shelf.width, 0.04, depth]} />
            <meshStandardMaterial color={body} />
          </mesh>
          <mesh position={[0, -0.01, depth / 2]}>
            <boxGeometry args={[shelf.width, 0.06, 0.02]} />
            <meshStandardMaterial color={dept.color} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[shelf.width, 0.4, depth]} />
        <meshStandardMaterial color={dept.color} roughness={0.7} />
      </mesh>
      {isFridge && (
        <mesh position={[0, 2.16, 0]}>
          <boxGeometry args={[shelf.width, 0.08, depth]} />
          <meshStandardMaterial color="#e3f2fd" emissive="#bbdefb" emissiveIntensity={0.8} />
        </mesh>
      )}
      {/* signboard */}
      <group position={[0, 2.65, 0]}>
        <mesh>
          <boxGeometry args={[Math.min(shelf.width * 0.7, 4), 0.5, 0.06]} />
          <meshStandardMaterial color={dept.color} />
        </mesh>
        <Text position={[0, 0, 0.04]} fontSize={0.24} color="#ffffff" anchorX="center" anchorY="middle" fontWeight={800} outlineWidth={0.008} outlineColor="#00000033">
          {dept.name}
        </Text>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.2, 0.55, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.6, 4]} />
            <meshStandardMaterial color="#9e9e9e" />
          </mesh>
        ))}
      </group>
      <group position={[0, 0, 0]}>
        {slots.map((slot) => (
          <ShelfProduct key={slot.product.id} slot={slot} copies={qualityCopies[quality]} detail={qualityDetail[quality]} onPick={onPick} />
        ))}
      </group>
    </group>
  )
}

/** Mount departments one after another so the first one appears quickly (progressive loading). */
export function useStaggeredCount(total: number, stepMs = 90) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (count >= total) return
    const t = setTimeout(() => setCount((c) => c + 1), count === 0 ? 0 : stepMs)
    return () => clearTimeout(t)
  }, [count, total, stepMs])
  return count
}
