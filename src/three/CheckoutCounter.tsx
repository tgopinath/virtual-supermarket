import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { getProduct } from '../data/products'
import { billTotal } from '../engine/checkout'
import { useSession } from '../store/sessionStore'
import { CHECKOUT } from './layout'
import { ProductModel } from './ProductModel'

// Counter runs along x. The shopper stands on +z, the cashier on −z.
const BELT = { x0: 1.6, x1: -0.2, y: 0.92 }
const SCANNER_X = -0.45
const BAG_X = -1.3

function Cashier() {
  const arm = useRef<THREE.Mesh>(null)
  const head = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (arm.current) arm.current.rotation.z = 2.4 + Math.sin(t * 3) * 0.35
    if (head.current) head.current.rotation.y = Math.sin(t * 0.7) * 0.25
  })
  return (
    <group position={[-0.5, 0, -0.75]}>
      <mesh position={[0, 0.85, 0]} castShadow><capsuleGeometry args={[0.2, 0.6, 6, 12]} /><meshStandardMaterial color="#26a69a" /></mesh>
      <group ref={head} position={[0, 1.55, 0]}>
        <mesh castShadow><sphereGeometry args={[0.17, 20, 20]} /><meshStandardMaterial color="#c68642" /></mesh>
        <mesh position={[0, 0.1, 0]}><sphereGeometry args={[0.175, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2.2]} /><meshStandardMaterial color="#212121" /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.06, 0.02, 0.15]}><sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>)}
        <mesh position={[0, -0.06, 0.15]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.045, 0.01, 6, 12, Math.PI]} /><meshStandardMaterial color="#b71c1c" /></mesh>
        <mesh position={[0, 0.16, 0.05]} rotation={[-0.2, 0, 0]}><cylinderGeometry args={[0.19, 0.19, 0.04, 20]} /><meshStandardMaterial color="#e53935" /></mesh>
      </group>
      <mesh ref={arm} position={[0.25, 1.1, 0.05]}><capsuleGeometry args={[0.05, 0.4, 4, 8]} /><meshStandardMaterial color="#26a69a" /></mesh>
      <mesh position={[-0.25, 0.95, 0.05]} rotation={[0, 0, -0.3]}><capsuleGeometry args={[0.05, 0.4, 4, 8]} /><meshStandardMaterial color="#26a69a" /></mesh>
      <Text position={[0, 0.95, 0.21]} fontSize={0.05} color="#fff" anchorX="center">Priya · Cashier</Text>
    </group>
  )
}

function ScannerLight({ active }: { active: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = active ? 0.9 : 0.35 + Math.sin(clock.elapsedTime * 8) * 0.25
  })
  return (
    <group position={[SCANNER_X, BELT.y, 0]}>
      <mesh><boxGeometry args={[0.36, 0.04, 0.5]} /><meshStandardMaterial color="#263238" /></mesh>
      <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.42]} />
        <meshPhysicalMaterial color="#455a64" roughness={0.05} transmission={0.4} />
      </mesh>
      <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.012]} />
        <meshBasicMaterial ref={mat} color="#ff1744" transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[0.4, 0.012]} />
        <meshBasicMaterial color="#ff1744" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {/* tower scanner */}
      <mesh position={[0, 0.18, -0.24]}><boxGeometry args={[0.32, 0.34, 0.04]} /><meshStandardMaterial color="#37474f" /></mesh>
      <mesh position={[0, 0.18, -0.218]}><planeGeometry args={[0.26, 0.26]} /><meshBasicMaterial color={active ? '#ff5252' : '#b71c1c'} toneMapped={false} /></mesh>
      {active && <pointLight color="#ff1744" intensity={1.5} distance={1.2} position={[0, 0.2, 0]} />}
    </group>
  )
}

function Belt() {
  const stripes = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = stripes.current
    if (!g) return
    for (const c of g.children) {
      c.position.x -= dt * 0.25
      if (c.position.x < BELT.x1) c.position.x += BELT.x0 - BELT.x1
    }
  })
  const n = 14
  return (
    <group position={[0, BELT.y, 0]}>
      <mesh position={[(BELT.x0 + BELT.x1) / 2, 0, 0]}><boxGeometry args={[BELT.x0 - BELT.x1, 0.03, 0.44]} /><meshStandardMaterial color="#212121" roughness={0.9} /></mesh>
      <group ref={stripes}>
        {Array.from({ length: n }, (_, i) => (
          <mesh key={i} position={[BELT.x1 + ((BELT.x0 - BELT.x1) / n) * i, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.02, 0.42]} />
            <meshBasicMaterial color="#424242" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function ConveyorItem({ productId, index }: { productId: string; index: number }) {
  const p = getProduct(productId)
  const ref = useRef<THREE.Group>(null)
  const goalX = BELT.x1 + 0.25 + index * 0.28
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, goalX, Math.min(1, dt * 3))
  })
  return (
    <group
      ref={ref}
      position={[BELT.x0, BELT.y + 0.016, 0]}
      onClick={(e) => { e.stopPropagation(); useSession.getState().scanItem(productId) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <group scale={Math.min(1.3, 0.2 / p.model.size)}><ProductModel product={p} detail={12} /></group>
      <mesh position={[0, 0.12, 0]} visible={false}><boxGeometry args={[0.26, 0.3, 0.4]} /></mesh>
    </group>
  )
}

/** The item that was just scanned glides across the scanner into the bagging area. */
function ScannedFlyer() {
  const last = useSession((s) => s.lastScanned)
  const ref = useRef<THREE.Group>(null)
  const t0 = useRef(0)
  const id = useRef<string | null>(null)
  if (last && last.id !== id.current) { id.current = last.id; t0.current = performance.now() }
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const t = Math.min(1, (performance.now() - t0.current) / 900)
    g.position.x = THREE.MathUtils.lerp(BELT.x1, BAG_X, t)
    g.position.y = BELT.y + 0.04 + Math.sin(t * Math.PI) * 0.12
    g.visible = t < 1
  })
  if (!last) return null
  const p = getProduct(last.id)
  return <group ref={ref} key={last.at}><group scale={Math.min(1.3, 0.2 / p.model.size)}><ProductModel product={p} detail={12} /></group></group>
}

function Register({ total, open, lastText }: { total: number; open: boolean; lastText: string }) {
  const drawer = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (drawer.current) drawer.current.position.z = THREE.MathUtils.lerp(drawer.current.position.z, open ? -0.05 : -0.35, Math.min(1, dt * 5))
  })
  return (
    <group position={[-1.0, 0.9, -0.15]}>
      <mesh position={[0, 0.06, -0.2]}><boxGeometry args={[0.45, 0.12, 0.4]} /><meshStandardMaterial color="#455a64" /></mesh>
      <mesh ref={drawer} position={[0, 0.02, -0.35]}><boxGeometry args={[0.42, 0.06, 0.38]} /><meshStandardMaterial color="#607d8b" /></mesh>
      {/* customer-facing display */}
      <group position={[0, 0.42, 0]} rotation={[-0.15, 0, 0]}>
        <mesh><boxGeometry args={[0.5, 0.26, 0.04]} /><meshStandardMaterial color="#263238" /></mesh>
        <mesh position={[0, 0, 0.021]}><planeGeometry args={[0.46, 0.22]} /><meshBasicMaterial color="#00251a" toneMapped={false} /></mesh>
        <Text position={[0, 0.05, 0.025]} fontSize={0.035} color="#69f0ae" anchorX="center" maxWidth={0.44}>{lastText || 'Welcome!'}</Text>
        <Text position={[0, -0.05, 0.025]} fontSize={0.06} color="#b9f6ca" anchorX="center" fontWeight={700}>{`TOTAL ₹${total}`}</Text>
      </group>
      <mesh position={[0, 0.2, -0.05]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#37474f" /></mesh>
    </group>
  )
}

function Terminal({ active }: { active: boolean }) {
  return (
    <group position={[0.6, 0.95, 0.2]} rotation={[-0.5, 0, 0]}>
      <mesh><boxGeometry args={[0.12, 0.03, 0.2]} /><meshStandardMaterial color="#212121" /></mesh>
      <mesh position={[0, 0.016, -0.04]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.09, 0.07]} /><meshBasicMaterial color={active ? '#40c4ff' : '#263238'} toneMapped={false} /></mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[((i % 3) - 1) * 0.028, 0.016, 0.03 + Math.floor(i / 3) * 0.022]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, 0.015]} />
          <meshBasicMaterial color="#9e9e9e" />
        </mesh>
      ))}
      <Text position={[0, 0.02, -0.12]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.02} color="#fff">CARD · UPI</Text>
    </group>
  )
}

function ReceiptPrinter({ printing }: { printing: boolean }) {
  const paper = useRef<THREE.Mesh>(null)
  const len = useRef(0)
  useFrame((_, dt) => {
    len.current = printing ? Math.min(0.35, len.current + dt * 0.25) : 0
    if (paper.current) {
      paper.current.scale.y = Math.max(0.001, len.current / 0.35)
      paper.current.position.y = 0.1 + len.current / 2
    }
  })
  return (
    <group position={[-1.45, 0.9, -0.25]}>
      <mesh position={[0, 0.05, 0]}><boxGeometry args={[0.16, 0.1, 0.18]} /><meshStandardMaterial color="#eceff1" /></mesh>
      <mesh ref={paper} position={[0, 0.1, 0]}><planeGeometry args={[0.1, 0.35]} /><meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

function Bags({ count }: { count: number }) {
  return (
    <group position={[BAG_X, 0.9, 0.05]}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[i * 0.3 - 0.15, 0, 0.1]}>
          <mesh position={[0, 0.17, 0]}><boxGeometry args={[0.26, 0.34, 0.16]} /><meshStandardMaterial color="#a1887f" roughness={0.9} /></mesh>
          <mesh position={[0, 0.38, 0]}><torusGeometry args={[0.06, 0.008, 6, 16, Math.PI]} /><meshStandardMaterial color="#6d4c41" /></mesh>
          <Text position={[0, 0.18, 0.081]} fontSize={0.035} color="#fff" anchorX="center">My Supermarket</Text>
        </group>
      ))}
    </group>
  )
}

export function CheckoutCounter() {
  const checkout = useSession((s) => s.checkout)
  const lastScanned = useSession((s) => s.lastScanned)
  const msg = useSession((s) => s.checkoutMsg)
  const scanning = !!lastScanned && Date.now() - lastScanned.at < 600
  const phase = checkout?.phase
  const total = checkout ? billTotal(checkout.bill) : 0
  const bagCount = checkout?.bill.length ? Math.min(3, Math.ceil(checkout.bill.length / 3)) : 0

  return (
    <group position={[CHECKOUT.x, 0, CHECKOUT.z]}>
      {/* counter body */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[3.6, 0.9, 0.7]} /><meshStandardMaterial color="#ff7043" roughness={0.6} /></mesh>
      <mesh position={[0, 0.905, 0]}><boxGeometry args={[3.62, 0.02, 0.72]} /><meshStandardMaterial color="#eceff1" /></mesh>
      <mesh position={[0, 0.45, 0.352]}><planeGeometry args={[3.0, 0.3]} /><meshStandardMaterial color="#ffccbc" /></mesh>
      <Text position={[0, 0.45, 0.356]} fontSize={0.14} color="#bf360c" fontWeight={800}>CASH COUNTER 1</Text>
      <Belt />
      <ScannerLight active={scanning} />
      {checkout?.queue.map((l, i) => <ConveyorItem key={l.productId} productId={l.productId} index={i} />)}
      <ScannedFlyer />
      <Register total={total} open={phase === 'change' || phase === 'receipt'} lastText={msg?.text ?? ''} />
      <Terminal active={phase === 'card'} />
      <ReceiptPrinter printing={phase === 'receipt'} />
      <Bags count={bagCount} />
      <Cashier />
      {/* lane sign */}
      <group position={[0, 2.6, 0]}>
        <mesh><boxGeometry args={[1.4, 0.45, 0.06]} /><meshStandardMaterial color="#ff7043" /></mesh>
        <Text position={[0, 0, 0.04]} fontSize={0.2} color="#fff" fontWeight={800}>CHECKOUT</Text>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.01, 0.01, 0.8, 4]} /><meshStandardMaterial color="#9e9e9e" /></mesh>
      </group>
    </group>
  )
}
