import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getProduct } from '../data/products'
import { useSession } from '../store/sessionStore'
import { controlsRef, DRAG_THRESHOLD_PX, press, setCameraEnabled } from './interaction'
import { STORE, viewFor } from './layout'
import { ProductModel } from './ProductModel'

/** Mouse/touch camera with smooth fly-to between departments, plus arrow/WASD walking. */
export function CameraRig() {
  const ref = useRef<CameraControls>(null)
  const seq = useSession((s) => s.camera.seq)
  const keys = useRef(new Set<string>())

  useEffect(() => {
    controlsRef.current = ref.current as unknown as typeof controlsRef.current
    return () => { controlsRef.current = null }
  }, [])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const { target } = useSession.getState().camera
    const v = viewFor(target)
    void c.setLookAt(...v.pos, ...v.look, seq > 1)
  }, [seq])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      keys.current.add(e.key.toLowerCase())
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const tmp = useRef(new THREE.Vector3())
  const tmpT = useRef(new THREE.Vector3())
  useFrame((_, dt) => {
    const c = ref.current
    if (!c || useSession.getState().phase !== 'shopping') return
    const k = keys.current
    const speed = 3.2 * dt
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
    const side = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
    if (!fwd && !side) return
    void c.forward(fwd * speed, false)
    void c.truck(side * speed, 0, false)
    // keep the shopper inside the store
    const p = c.getPosition(tmp.current)
    const cx = THREE.MathUtils.clamp(p.x, -STORE.halfW + 0.8, STORE.halfW - 0.8)
    const cz = THREE.MathUtils.clamp(p.z, -STORE.halfD + 1.2, STORE.halfD - 0.5)
    if (cx !== p.x || cz !== p.z) {
      const t = c.getTarget(tmpT.current)
      void c.setLookAt(cx, p.y, cz, t.x + cx - p.x, t.y, t.z + cz - p.z, false)
    }
  })

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.3}
      maxDistance={9}
      maxPolarAngle={Math.PI * 0.62}
      smoothTime={0.6}
      draggingSmoothTime={0.15}
      dollySpeed={0.6}
    />
  )
}

/** Turns a press on a product into a drag; drops land on the 3D trolley or the HUD trolley button. */
export function DragController() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = press.current
      if (!p || useSession.getState().dragging) return
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_THRESHOLD_PX) {
        useSession.getState().setDragging(p.id)
        document.body.style.cursor = 'grabbing'
      }
    }
    const up = (e: PointerEvent) => {
      const dragging = useSession.getState().dragging
      press.current = null
      setCameraEnabled(true)
      if (!dragging) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (el?.closest('[data-drop="cart"]')) useSession.getState().addToCart(dragging)
      // Clear after the click event so the product's onClick can see that this was a drag.
      setTimeout(() => {
        useSession.getState().setDragging(null)
        document.body.style.cursor = ''
      }, 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])
  return null
}

const v = new THREE.Vector3()
/** The product follows the pointer while it is being dragged. */
export function DragGhost() {
  const dragging = useSession((s) => s.dragging)
  const ref = useRef<THREE.Group>(null)
  const { camera, pointer } = useThree()
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    v.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize()
    g.position.copy(camera.position).addScaledVector(v, 1.1)
    g.rotation.y = clock.elapsedTime * 2
  })
  if (!dragging) return null
  return (
    <group ref={ref} raycast={() => null}>
      <group scale={1.4} ref={(el) => el?.traverse((o) => { o.raycast = () => {} })}>
        <ProductModel product={getProduct(dragging)} detail={14} highlight />
      </group>
    </group>
  )
}
