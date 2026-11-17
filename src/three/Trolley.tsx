import { Billboard, Text } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getProduct } from '../data/products'
import { cartCount, cartTotal } from '../engine/cart'
import { shopItem } from '../engine/rewards'
import { useProgress } from '../store/progressStore'
import { useSession } from '../store/sessionStore'
import { TROLLEY_BAY, trolleySpot, type Vec3 } from './layout'
import { ProductModel } from './ProductModel'

const BASKET = { w: 0.56, d: 0.86, h: 0.42, y: 0.55 }
const WHEEL_R = 0.06
const tmp = new THREE.Vector3()

function Bars({ color }: { color: string }) {
  // Open wire basket: thin bars on each side.
  const bars: Array<{ p: Vec3; s: Vec3 }> = []
  const { w, d, h } = BASKET
  for (let i = 0; i <= 6; i++) {
    const x = -w / 2 + (w / 6) * i
    bars.push({ p: [x, h / 2, d / 2], s: [0.012, h, 0.012] }, { p: [x, h / 2, -d / 2], s: [0.012, h, 0.012] })
  }
  for (let i = 0; i <= 8; i++) {
    const z = -d / 2 + (d / 8) * i
    bars.push({ p: [w / 2, h / 2, z], s: [0.012, h, 0.012] }, { p: [-w / 2, h / 2, z], s: [0.012, h, 0.012] })
  }
  for (const y of [0, h / 2, h]) {
    bars.push({ p: [0, y, d / 2], s: [w, 0.016, 0.016] }, { p: [0, y, -d / 2], s: [w, 0.016, 0.016] })
    bars.push({ p: [w / 2, y, 0], s: [0.016, 0.016, d] }, { p: [-w / 2, y, 0], s: [0.016, 0.016, d] })
  }
  return (
    <group>
      {bars.map((b, i) => (
        <mesh key={i} position={b.p}>
          <boxGeometry args={b.s} />
          <meshStandardMaterial color="#cfd8dc" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[w, 0.01, d]} />
        <meshStandardMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

export function Trolley({ vrAnchor }: { vrAnchor?: Vec3 | null }) {
  const group = useRef<THREE.Group>(null)
  const wheels = useRef<THREE.Group[]>([])
  const cart = useSession((s) => s.cart)
  const hasTrolley = useSession((s) => s.hasTrolley)
  const target = useSession((s) => s.camera.target)
  const lastAdded = useSession((s) => s.lastAdded)
  const color = useProgress((s) => shopItem(s.equipped.trolley).value)
  const bounce = useRef(0)
  const lastAddedAt = useRef(0)

  const items = useMemo(() => {
    const out: string[] = []
    for (const l of cart) for (let i = 0; i < l.qty && out.length < 24; i++) out.push(l.productId)
    return out
  }, [cart])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const goal = hasTrolley ? (vrAnchor ?? trolleySpot(target)) : trolleySpot('outside')
    tmp.set(goal[0], 0, goal[2])
    const before = g.position.clone()
    g.position.lerp(tmp, Math.min(1, dt * 2.2))
    const moved = before.distanceTo(g.position)
    if (moved > 0.0005) {
      const heading = Math.atan2(g.position.x - before.x, g.position.z - before.z)
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, heading + Math.PI, Math.min(1, dt * 3))
      for (const w of wheels.current) if (w) w.rotation.x += moved / WHEEL_R
    }
    if (lastAdded && lastAdded.at !== lastAddedAt.current) {
      lastAddedAt.current = lastAdded.at
      bounce.current = 1
    }
    bounce.current = Math.max(0, bounce.current - dt * 3)
    g.scale.setScalar(1 + Math.sin(bounce.current * Math.PI) * 0.06)
  })

  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const s = useSession.getState()
    if (s.dragging) {
      e.stopPropagation()
      s.addToCart(s.dragging)
    }
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const s = useSession.getState()
    if (s.dragging) return
    if (!s.hasTrolley) s.takeTrolley()
    else s.setCartOpen(true)
  }

  return (
    <group ref={group} position={[TROLLEY_BAY.x, 0, TROLLEY_BAY.z]} onPointerUp={onUp} onClick={onClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      {/* chassis */}
      <group position={[0, BASKET.y, 0]}>
        <Bars color={color} />
        {items.map((id, i) => {
          const p = getProduct(id)
          const col = i % 3, row = Math.floor(i / 3) % 4, layer = Math.floor(i / 12)
          return (
            <group key={i} position={[(col - 1) * 0.17, 0.02 + layer * 0.14, (row - 1.5) * 0.19]} scale={Math.min(1, 0.16 / p.model.size)}>
              <ProductModel product={p} detail={8} />
            </group>
          )
        })}
      </group>
      {/* handle */}
      <mesh position={[0, BASKET.y + BASKET.h + 0.12, BASKET.d / 2 + 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, BASKET.w + 0.06, 10]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * BASKET.w) / 2, BASKET.y + BASKET.h, BASKET.d / 2 + 0.06]} rotation={[0.9, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
          <meshStandardMaterial color="#b0bec5" metalness={0.7} />
        </mesh>
      ))}
      {/* frame & wheels */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * BASKET.w) / 2.4, BASKET.y / 2 + 0.04, 0]}>
          <boxGeometry args={[0.02, 0.02, BASKET.d]} />
          <meshStandardMaterial color="#90a4ae" metalness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[BASKET.w * 0.85, 0.015, BASKET.d * 0.9]} />
        <meshStandardMaterial color="#b0bec5" metalness={0.6} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={i} position={[(sx * BASKET.w) / 2.4, WHEEL_R, (sz * BASKET.d) / 2.3]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.24, 5]} />
            <meshStandardMaterial color="#90a4ae" metalness={0.7} />
          </mesh>
          <group ref={(el) => { if (el) wheels.current[i] = el }}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.035, 14]} />
              <meshStandardMaterial color="#37474f" />
            </mesh>
            <mesh position={[0.019, WHEEL_R * 0.5, 0]}>
              <boxGeometry args={[0.004, 0.02, 0.02]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        </group>
      ))}
      {/* drop zone: big invisible box so dropping a dragged product is forgiving */}
      <mesh position={[0, BASKET.y + 0.3, 0]} visible={false}>
        <boxGeometry args={[BASKET.w + 0.5, 1.2, BASKET.d + 0.4]} />
      </mesh>
      <Billboard position={[0, 1.2, 0]}>
        <mesh>
          <planeGeometry args={[0.6, 0.16]} />
          <meshBasicMaterial color={hasTrolley ? '#ffffff' : '#ffeb3b'} transparent opacity={0.92} toneMapped={false} />
        </mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.06} color="#1f2937" anchorX="center" anchorY="middle" fontWeight={700}>
          {hasTrolley ? `${cartCount(cart)} items  ·  ₹${cartTotal(cart)}` : 'Tap to take me!'}
        </Text>
      </Billboard>
    </group>
  )
}
