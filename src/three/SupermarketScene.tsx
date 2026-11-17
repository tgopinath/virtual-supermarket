import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import { Suspense, useEffect } from 'react'
import { shopItem } from '../engine/rewards'
import { useProgress } from '../store/progressStore'
import { xrStore } from '../xr/xrStore'
import { Building } from './Building'
import { CheckoutCounter } from './CheckoutCounter'
import { CameraRig, DragController, DragGhost } from './Controls'
import { SHELVES, type Vec3 } from './layout'
import { Shelf, useStaggeredCount } from './Shelves'
import { ShopBuddy } from './ShopBuddy'
import { THEMES } from './themes'
import { Trolley } from './Trolley'
import { useVRPlayer, VRCheckoutPanel, VRHud, VRResultPanel, VRRig } from './VR'

function Departments({ onReady }: { onReady?: (n: number, total: number) => void }) {
  const count = useStaggeredCount(SHELVES.length)
  useEffect(() => onReady?.(count, SHELVES.length), [count, onReady])
  return <>{SHELVES.slice(0, count).map((s) => <Shelf key={s.id} shelf={s} />)}</>
}

function World({ onReady }: { onReady?: (n: number, total: number) => void }) {
  const env = useProgress((s) => shopItem(s.equipped.environment).value)
  const quality = useProgress((s) => s.settings.quality)
  const theme = THEMES[env] ?? THEMES.sunny
  const vr = useVRPlayer()
  const offset = (p: Vec3, dx: number, dz: number): Vec3 => [p[0] + dx, 0, p[2] + dz]

  return (
    <>
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.fog, 28, 70]} />
      <ambientLight intensity={theme.ambient} />
      <hemisphereLight args={['#ffffff', '#b0a090', 0.6]} />
      <directionalLight
        position={[8, 14, 10]}
        intensity={theme.sun}
        color={theme.sunColor}
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <pointLight position={[0, 4.2, -6]} intensity={theme.ambient * 8} distance={18} />
      <pointLight position={[-8, 4.2, 5]} intensity={theme.ambient * 6} distance={12} />

      <Building theme={theme} />
      <Departments onReady={onReady} />
      <CheckoutCounter />
      <Trolley vrAnchor={vr.inXR ? offset(vr.pos, 0.55, -0.7) : null} />
      <ShopBuddy anchor={vr.inXR ? offset(vr.pos, -1.1, -1.2) : null} />

      {vr.inXR ? (
        <>
          <VRRig pos={vr.pos} setPos={vr.setPos} />
          <VRHud pos={vr.pos} />
          <VRCheckoutPanel />
          <VRResultPanel />
        </>
      ) : (
        <>
          <CameraRig />
          <DragGhost />
        </>
      )}
    </>
  )
}

export function SupermarketCanvas({ onReady }: { onReady?: (n: number, total: number) => void }) {
  const quality = useProgress((s) => s.settings.quality)
  const dpr: [number, number] = quality === 'low' ? [1, 1] : quality === 'medium' ? [1, 1.5] : [1, 2]
  return (
    <>
      <DragController />
      <Canvas
        shadows={quality === 'high'}
        dpr={dpr}
        camera={{ fov: 60, near: 0.05, far: 200, position: [0, 1.7, 20] }}
        gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
        style={{ touchAction: 'none' }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <World onReady={onReady} />
          </Suspense>
        </XR>
      </Canvas>
    </>
  )
}
