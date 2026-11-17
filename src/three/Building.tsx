import { Text } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSession } from '../store/sessionStore'
import { controlsRef } from './interaction'
import { DOOR, STORE, TROLLEY_BAY } from './layout'
import type { Theme } from './themes'

function tileTexture(a: string, b: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = a
  g.fillRect(0, 0, 128, 128)
  g.fillStyle = b
  g.fillRect(0, 0, 64, 64)
  g.fillRect(64, 64, 64, 64)
  g.strokeStyle = '#00000014'
  g.strokeRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(STORE.halfW, STORE.halfD)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Double-click / double-tap the floor to walk there. */
function walkTo(e: ThreeEvent<MouseEvent>) {
  const c = controlsRef.current
  if (!c) return
  e.stopPropagation()
  const target = new THREE.Vector3()
  const pos = new THREE.Vector3()
  c.getTarget(target)
  c.getPosition(pos)
  const p = e.point
  const nx = THREE.MathUtils.clamp(p.x, -STORE.halfW + 1, STORE.halfW - 1)
  const nz = THREE.MathUtils.clamp(p.z, -STORE.halfD + 1.5, STORE.halfD - 0.5)
  const dx = nx - target.x
  const dz = nz - target.z
  void c.setLookAt(pos.x + dx, pos.y, pos.z + dz, target.x + dx, target.y, target.z + dz, true)
}

export function Floor({ theme }: { theme: Theme }) {
  const tex = useMemo(() => tileTexture(theme.floorA, theme.floorB), [theme.floorA, theme.floorB])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onDoubleClick={walkTo}>
      <planeGeometry args={[STORE.halfW * 2, STORE.halfD * 2]} />
      <meshStandardMaterial map={tex} roughness={0.85} />
    </mesh>
  )
}

function SlidingDoors({ open }: { open: boolean }) {
  const left = useRef<THREE.Mesh>(null)
  const right = useRef<THREE.Mesh>(null)
  const w = DOOR.width / 2
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 3)
    if (left.current) left.current.position.x = THREE.MathUtils.lerp(left.current.position.x, open ? -w * 1.45 : -w / 2, k)
    if (right.current) right.current.position.x = THREE.MathUtils.lerp(right.current.position.x, open ? w * 1.45 : w / 2, k)
  })
  return (
    <group position={[DOOR.x, 0, DOOR.z]}>
      {[left, right].map((ref, i) => (
        <mesh key={i} ref={ref} position={[(i ? 1 : -1) * (w / 2), 1.3, 0.05]}>
          <boxGeometry args={[w, 2.6, 0.05]} />
          <meshPhysicalMaterial color="#b3e5fc" transparent opacity={0.35} roughness={0.05} metalness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, 2.75, 0.05]}><boxGeometry args={[DOOR.width + 0.4, 0.3, 0.2]} /><meshStandardMaterial color="#455a64" /></mesh>
      <mesh position={[0, 2.75, 0.16]}><boxGeometry args={[0.3, 0.06, 0.02]} /><meshBasicMaterial color={open ? '#69f0ae' : '#ff5252'} toneMapped={false} /></mesh>
    </group>
  )
}

function Walls({ theme, doorsOpen }: { theme: Theme; doorsOpen: boolean }) {
  const { halfW: W, halfD: D, height: H } = STORE
  const side = (W - DOOR.width / 2 - 0.2)
  return (
    <group>
      <mesh position={[0, H / 2, -D]} receiveShadow><boxGeometry args={[W * 2, H, 0.2]} /><meshStandardMaterial color={theme.wall} /></mesh>
      <mesh position={[-W, H / 2, 0]} receiveShadow><boxGeometry args={[0.2, H, D * 2]} /><meshStandardMaterial color={theme.wall} /></mesh>
      <mesh position={[W, H / 2, 0]} receiveShadow><boxGeometry args={[0.2, H, D * 2]} /><meshStandardMaterial color={theme.wall} /></mesh>
      {/* front: glass panels either side of the door, solid header above */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (DOOR.width / 2 + 0.2 + side / 2), 0, D]}>
          <mesh position={[0, 0.4, 0]}><boxGeometry args={[side, 0.8, 0.2]} /><meshStandardMaterial color="#ff7a45" /></mesh>
          <mesh position={[0, 1.9, 0]}><boxGeometry args={[side, 2.2, 0.06]} /><meshPhysicalMaterial color="#e1f5fe" transparent opacity={0.25} roughness={0.05} /></mesh>
        </group>
      ))}
      <mesh position={[0, 4, D]}><boxGeometry args={[W * 2, 2, 0.2]} /><meshStandardMaterial color="#ff7a45" /></mesh>
      <group position={[0, 4.05, D + 0.12]}>
        <mesh><boxGeometry args={[9, 1.1, 0.06]} /><meshStandardMaterial color="#ffffff" /></mesh>
        <Text position={[0, 0.12, 0.04]} fontSize={0.42} color="#e64a19" fontWeight={800} anchorX="center" anchorY="middle">Welcome to My Supermarket</Text>
        <Text position={[0, -0.36, 0.04]} fontSize={0.2} color="#455a64" anchorX="center" anchorY="middle">Fresh · Friendly · Fun to learn</Text>
      </group>
      <SlidingDoors open={doorsOpen} />
      {/* ceiling with light panels */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[W * 2, D * 2]} /><meshStandardMaterial color={theme.ceiling} side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 4 }, (_, i) => Array.from({ length: 3 }, (_, j) => (
        <mesh key={`${i}-${j}`} position={[-10.5 + i * 7, H - 0.02, -8 + j * 7]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 0.4]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )))}
    </group>
  )
}

function Outside({ theme }: { theme: Theme }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, STORE.halfD + 6]} receiveShadow>
        <planeGeometry args={[60, 12]} />
        <meshStandardMaterial color="#cfd8dc" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={theme.sky === '#1a237e' ? '#33691e' : '#8bc34a'} />
      </mesh>
      {/* welcome mat & planters */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, STORE.halfD + 1]}><planeGeometry args={[3, 1.2]} /><meshStandardMaterial color="#e64a19" /></mesh>
      <Text rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, STORE.halfD + 1]} fontSize={0.28} color="#fff" fontWeight={700}>WELCOME</Text>
      {[-4, 4].map((x) => (
        <group key={x} position={[x, 0, STORE.halfD + 1.5]}>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.4, 0.3, 0.6, 16]} /><meshStandardMaterial color="#8d6e63" /></mesh>
          <mesh position={[0, 0.9, 0]}><icosahedronGeometry args={[0.55, 1]} /><meshStandardMaterial color="#43a047" flatShading /></mesh>
        </group>
      ))}
    </group>
  )
}

function InstructionBoard() {
  const lines = ['1. Take a trolley', '2. Visit the aisles', '3. Tap or drag items in', '4. Pay at the cash counter', '5. Collect your receipt!']
  return (
    <group position={[6.8, 0, 10.4]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.03, 0.03, 1.4, 6]} /><meshStandardMaterial color="#78909c" /></mesh>
      <mesh position={[0, 1.55, 0]}><boxGeometry args={[1.5, 1.1, 0.05]} /><meshStandardMaterial color="#fff8e1" /></mesh>
      <Text position={[0, 1.95, 0.03]} fontSize={0.12} color="#e64a19" fontWeight={800}>How to shop</Text>
      {lines.map((l, i) => (
        <Text key={l} position={[-0.62, 1.75 - i * 0.15, 0.03]} fontSize={0.085} color="#37474f" anchorX="left">{l}</Text>
      ))}
    </group>
  )
}

function TrolleyBay() {
  // Parked decorative trolleys behind the one the child takes.
  return (
    <group position={[TROLLEY_BAY.x + 1.3, 0, TROLLEY_BAY.z]}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[i * 0.35, 0, 0]}>
          <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.3, 0.42, 0.86]} /><meshStandardMaterial color="#b0bec5" metalness={0.6} transparent opacity={0.7} /></mesh>
          <mesh position={[0, 1.1, 0.5]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.34, 8]} /><meshStandardMaterial color="#e53935" /></mesh>
        </group>
      ))}
      <Text position={[0.35, 1.6, 0]} fontSize={0.16} color="#455a64" fontWeight={700}>TROLLEYS</Text>
    </group>
  )
}

function FestivalBulbs({ colors }: { colors: string[] }) {
  const pts = useMemo(() => {
    const out: Array<{ p: [number, number, number]; c: string }> = []
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 26; i++) {
        const x = -13 + i
        out.push({ p: [x, 4.3 - Math.abs(Math.sin(i * 0.6)) * 0.4, -9 + row * 6], c: colors[(i + row) % colors.length] })
      }
    }
    return out
  }, [colors])
  return (
    <group>
      {pts.map((b, i) => (
        <mesh key={i} position={b.p}><sphereGeometry args={[0.07, 8, 8]} /><meshBasicMaterial color={b.c} toneMapped={false} /></mesh>
      ))}
    </group>
  )
}

export function Building({ theme }: { theme: Theme }) {
  const doorsOpen = useSession((s) => s.doorsOpen)
  return (
    <group>
      <Floor theme={theme} />
      <Walls theme={theme} doorsOpen={doorsOpen} />
      <Outside theme={theme} />
      <InstructionBoard />
      <TrolleyBay />
      {theme.bulbs && <FestivalBulbs colors={theme.bulbs} />}
    </group>
  )
}
