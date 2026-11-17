import { RoundedBox, Text } from '@react-three/drei'
import type { ThreeElements, ThreeEvent } from '@react-three/fiber'
import { useState, type ReactNode } from 'react'
import { CURRENCY, type Denomination } from '../data/currency'

// Minimal spatial UI kit for VR: panels, buttons and currency pieces as real meshes,
// so controller rays and hand pinches can press them.

export function Panel3D({ width, height, children, color = '#ffffff', ...props }: { width: number; height: number; children?: ReactNode; color?: string } & ThreeElements['group']) {
  return (
    <group {...props}>
      <RoundedBox args={[width, height, 0.02]} radius={0.03} smoothness={3}>
        <meshStandardMaterial color={color} transparent opacity={0.94} />
      </RoundedBox>
      <group position={[0, 0, 0.012]}>{children}</group>
    </group>
  )
}

export function Label({ children, size = 0.035, color = '#1f2937', ...props }: { children: string; size?: number; color?: string } & ThreeElements['group']) {
  return (
    <group {...props}>
      <Text fontSize={size} color={color} anchorX="left" anchorY="middle" maxWidth={0.9}>{children}</Text>
    </group>
  )
}

export function Button3D({ label, onPress, width = 0.22, height = 0.07, color = '#ff7a45', textColor = '#ffffff', disabled = false, ...props }: {
  label: string; onPress: () => void; width?: number; height?: number; color?: string; textColor?: string; disabled?: boolean
} & ThreeElements['group']) {
  const [hover, setHover] = useState(false)
  const [down, setDown] = useState(false)
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!disabled) onPress()
  }
  return (
    <group {...props}>
      <group
        position={[0, 0, down ? 0.002 : 0.01]}
        onClick={click}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
        onPointerOut={() => { setHover(false); setDown(false) }}
        onPointerDown={() => setDown(true)}
        onPointerUp={() => setDown(false)}
      >
        <RoundedBox args={[width, height, 0.02]} radius={0.015} smoothness={2}>
          <meshStandardMaterial color={disabled ? '#bdbdbd' : color} emissive={hover && !disabled ? '#ffffff' : '#000000'} emissiveIntensity={hover ? 0.25 : 0} />
        </RoundedBox>
        <Text position={[0, 0, 0.012]} fontSize={height * 0.42} color={textColor} anchorX="center" anchorY="middle" maxWidth={width * 0.95} fontWeight={700}>
          {label}
        </Text>
      </group>
    </group>
  )
}

/** A coin or note that can be pressed in VR (and in the 2D canvas fallback). */
export function Money3D({ value, onPress, count, ...props }: { value: Denomination; onPress?: () => void; count?: number } & ThreeElements['group']) {
  const c = CURRENCY[value]
  const [hover, setHover] = useState(false)
  const handlers = onPress ? {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPress() },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true) },
    onPointerOut: () => setHover(false),
  } : {}
  return (
    <group {...props}>
      <group {...handlers} scale={hover ? 1.1 : 1}>
        {c.kind === 'coin' ? (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh><cylinderGeometry args={[0.035 + value * 0.0012, 0.035 + value * 0.0012, 0.008, 24]} /><meshStandardMaterial color={c.color} metalness={0.8} roughness={0.3} /></mesh>
            {value === 10 && <mesh position={[0, 0.0045, 0]}><cylinderGeometry args={[0.03, 0.03, 0.001, 24]} /><meshStandardMaterial color="#cfd8dc" metalness={0.8} roughness={0.3} /></mesh>}
          </group>
        ) : (
          <group>
            <mesh><boxGeometry args={[0.15, 0.07, 0.003]} /><meshStandardMaterial color={c.color} roughness={0.8} /></mesh>
            <mesh position={[-0.045, 0, 0.002]}><circleGeometry args={[0.022, 20]} /><meshStandardMaterial color={c.accent} /></mesh>
          </group>
        )}
        <Text position={[c.kind === 'coin' ? 0 : 0.02, 0, 0.006]} fontSize={c.kind === 'coin' ? 0.022 : 0.028} color="#1f2937" anchorX="center" anchorY="middle" fontWeight={800}>
          {c.label}
        </Text>
        {count != null && (
          <Text position={[0, -0.06, 0.006]} fontSize={0.022} color="#374151" anchorX="center">{`× ${count}`}</Text>
        )}
      </group>
    </group>
  )
}
