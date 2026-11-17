import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { shopItem } from '../engine/rewards'
import { useProgress } from '../store/progressStore'
import { useSession } from '../store/sessionStore'
import { buddySpot, type Vec3 } from './layout'

const goal = new THREE.Vector3()
const look = new THREE.Vector3()

/** ShopBuddy: a friendly robot that follows the shopper and reacts with expressions. */
export function ShopBuddy({ anchor }: { anchor?: Vec3 | null }) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Mesh>(null)
  const armR = useRef<THREE.Mesh>(null)
  const target = useSession((s) => s.camera.target)
  const mood = useSession((s) => s.buddy?.mood ?? 'happy')
  const accessory = useProgress((s) => shopItem(s.equipped.accessory).value)

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime
    const r = root.current
    if (!r) return
    const spot = anchor ?? buddySpot(target)
    goal.set(spot[0], 0, spot[2])
    r.position.lerp(goal, Math.min(1, dt * 1.8))
    look.set(camera.position.x, r.position.y, camera.position.z)
    r.lookAt(look)
    if (body.current) {
      const hop = mood === 'celebrate' ? Math.abs(Math.sin(t * 6)) * 0.18 : 0
      body.current.position.y = 0.85 + Math.sin(t * 2) * 0.04 + hop
      body.current.rotation.z = mood === 'thinking' ? 0.15 : mood === 'oops' ? Math.sin(t * 10) * 0.05 : 0
    }
    if (eyes.current) eyes.current.scale.y = Math.sin(t * 1.3) > 0.97 ? 0.1 : 1
    const up = mood === 'celebrate'
    if (armL.current) armL.current.rotation.z = up ? 2.6 + Math.sin(t * 8) * 0.3 : 0.3 + Math.sin(t * 2) * 0.1
    if (armR.current) armR.current.rotation.z = up ? -2.6 - Math.sin(t * 8) * 0.3 : -0.3 - Math.sin(t * 2 + 1) * 0.1
  })

  const mouth = {
    happy: <mesh position={[0, -0.07, 0.19]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.06, 0.014, 6, 16, Math.PI]} /><meshBasicMaterial color="#263238" /></mesh>,
    celebrate: <mesh position={[0, -0.07, 0.19]} rotation={[0, 0, Math.PI]}><circleGeometry args={[0.065, 16, 0, Math.PI]} /><meshBasicMaterial color="#c62828" side={THREE.DoubleSide} /></mesh>,
    thinking: <mesh position={[0.02, -0.08, 0.2]}><boxGeometry args={[0.08, 0.016, 0.01]} /><meshBasicMaterial color="#263238" /></mesh>,
    oops: <mesh position={[0, -0.08, 0.19]}><torusGeometry args={[0.03, 0.012, 6, 16]} /><meshBasicMaterial color="#263238" /></mesh>,
  }[mood]

  return (
    <group ref={root} position={[-2.4, 0, 13.4]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.32, 24]} /><meshBasicMaterial color="#000" transparent opacity={0.15} /></mesh>
      <group ref={body} position={[0, 0.85, 0]}>
        {/* body */}
        <mesh castShadow><capsuleGeometry args={[0.24, 0.3, 8, 16]} /><meshStandardMaterial color="#ff7a45" roughness={0.4} /></mesh>
        <mesh position={[0, 0.02, 0.22]}><circleGeometry args={[0.1, 20]} /><meshStandardMaterial color="#fff3e0" /></mesh>
        <mesh position={[0, 0.02, 0.225]}><ringGeometry args={[0.04, 0.06, 20]} /><meshBasicMaterial color="#ff7a45" /></mesh>
        {/* head */}
        <group position={[0, 0.52, 0]}>
          <mesh castShadow><sphereGeometry args={[0.22, 24, 24]} /><meshStandardMaterial color="#fffaf3" roughness={0.3} /></mesh>
          <mesh position={[0, 0.02, 0.12]}><sphereGeometry args={[0.15, 20, 20]} /><meshStandardMaterial color="#263238" roughness={0.2} /></mesh>
          <group ref={eyes}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.06, 0.04, 0.26]}><sphereGeometry args={[0.03, 12, 12]} /><meshBasicMaterial color="#4dd0e1" toneMapped={false} /></mesh>
            ))}
          </group>
          {mouth}
          {/* antenna */}
          <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.008, 0.008, 0.12, 6]} /><meshStandardMaterial color="#90a4ae" /></mesh>
          <mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.035, 12, 12]} /><meshStandardMaterial color="#ffd54f" emissive="#ffd54f" emissiveIntensity={0.8} /></mesh>
          {accessory === 'cap' && (
            <group position={[0, 0.16, 0]}>
              <mesh><sphereGeometry args={[0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1e88e5" /></mesh>
              <mesh position={[0, 0, 0.18]} rotation={[0.1, 0, 0]}><boxGeometry args={[0.24, 0.015, 0.14]} /><meshStandardMaterial color="#1565c0" /></mesh>
            </group>
          )}
          {accessory === 'crown' && (
            <group position={[0, 0.2, 0]}>
              <mesh><cylinderGeometry args={[0.13, 0.15, 0.08, 16, 1, true]} /><meshStandardMaterial color="#ffc107" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} /></mesh>
              {Array.from({ length: 6 }, (_, i) => (
                <mesh key={i} position={[Math.cos((i / 6) * Math.PI * 2) * 0.13, 0.07, Math.sin((i / 6) * Math.PI * 2) * 0.13]}><coneGeometry args={[0.025, 0.07, 4]} /><meshStandardMaterial color="#ffc107" metalness={0.8} /></mesh>
              ))}
            </group>
          )}
          {accessory === 'glasses' && (
            <group position={[0, 0.04, 0.27]}>
              {[-1, 1].map((s) => <mesh key={s} position={[s * 0.065, 0, 0]}><torusGeometry args={[0.045, 0.01, 6, 16]} /><meshStandardMaterial color="#111" /></mesh>)}
              <mesh><boxGeometry args={[0.04, 0.01, 0.01]} /><meshStandardMaterial color="#111" /></mesh>
            </group>
          )}
        </group>
        {/* arms */}
        <mesh ref={armL} position={[0.28, 0.1, 0]}><capsuleGeometry args={[0.05, 0.22, 4, 8]} /><meshStandardMaterial color="#ff8a65" /></mesh>
        <mesh ref={armR} position={[-0.28, 0.1, 0]}><capsuleGeometry args={[0.05, 0.22, 4, 8]} /><meshStandardMaterial color="#ff8a65" /></mesh>
      </group>
      {/* hover base */}
      <mesh position={[0, 0.35, 0]}><coneGeometry args={[0.16, 0.25, 16]} /><meshStandardMaterial color="#ffab91" /></mesh>
    </group>
  )
}
