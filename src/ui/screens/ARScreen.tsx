import { Billboard, OrbitControls, Text } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { IfInSessionMode, XR, XRDomOverlay, useXRHitTest, useXRInputSourceEvent } from '@react-three/xr'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { sfx } from '../../audio/audio'
import { DENOMINATIONS, type Denomination } from '../../data/currency'
import { getProduct } from '../../data/products'
import { randInt } from '../../engine/challenges'
import type { Question } from '../../engine/questions'
import { CheckoutCounter } from '../../three/CheckoutCounter'
import { productWorldPos, SHELVES, STORE } from '../../three/layout'
import { Money3D } from '../../three/Panel3D'
import { Shelf } from '../../three/Shelves'
import { useProgress } from '../../store/progressStore'
import { useSession } from '../../store/sessionStore'
import { detectXR, xrStore, type XRSupport } from '../../xr/xrStore'
import { ScreenShell } from '../components/Kit'
import { MoneyPiece } from '../components/Money'

// ---- shared AR state (kept local to this screen) ---------------------------

type Tool = 'store' | 'basket' | 'shop' | 'money'
interface Placed { d: Denomination; pos: [number, number, number]; id: number }

function useARState() {
  const age = useProgress((s) => s.profile?.age ?? 'middle')
  const [tool, setTool] = useState<Tool>('store')
  const [scale, setScale] = useState(0.05)
  const [rot, setRot] = useState(0)
  const [storePos, setStorePos] = useState<[number, number, number] | null>(null)
  const [basketPos, setBasketPos] = useState<[number, number, number] | null>(null)
  const [basket, setBasket] = useState<string[]>([])
  const [info, setInfo] = useState<string | null>(null)
  const [money, setMoney] = useState<Placed[]>([])
  const [denom, setDenom] = useState<Denomination>(10)
  const newTarget = () => (age === 'little' ? randInt(Math.random, 5, 30) : age === 'middle' ? randInt(Math.random, 20, 150) : randInt(Math.random, 100, 900))
  const [target, setTarget] = useState(newTarget)
  const [feedback, setFeedback] = useState<string | null>(null)
  const total = money.reduce((s, m) => s + m.d, 0)
  const seq = useRef(0)

  const pick = (id: string) => {
    sfx.pickup()
    setInfo(id)
    setBasket((b) => [...b, id])
    useProgress.getState().identify(id)
    const p = getProduct(id)
    useSession.getState().say(`${p.name}, ₹${p.price}. Added to your AR basket.`)
  }
  const placeAt = (pos: [number, number, number]) => {
    if (tool === 'store') { setStorePos(pos); sfx.place(); setTool('shop') }
    else if (tool === 'basket') { setBasketPos(pos); sfx.place(); setTool('shop') }
    else if (tool === 'money') { setMoney((m) => [...m, { d: denom, pos, id: ++seq.current }]); denom >= 20 ? sfx.note() : sfx.coin() }
  }
  const check = () => {
    const ok = total === target
    const q: Question = { id: `ar-${Date.now()}`, skill: 'make-amount', prompt: `Make ₹${target}`, input: 'make-amount', answer: target, hint: '', explain: '' }
    const award = useProgress.getState().recordQuiz({ questions: [q], correct: [ok], passShare: 1 })
    useSession.getState().pushAchievements(award.achievements)
    if (ok) {
      sfx.celebrate()
      setFeedback(`Correct! ₹${target}. +${award.coins} coins`)
      setMoney([]); setTarget(newTarget())
    } else {
      sfx.wrong()
      setFeedback(total < target ? `That is ₹${total}. Add ₹${target - total} more.` : `That is ₹${total}. Take away ₹${total - target}.`)
    }
  }
  return { tool, setTool, scale, setScale, rot, setRot, storePos, setStorePos, basketPos, basket, setBasket, info, pick, placeAt, money, setMoney, denom, setDenom, target, total, check, feedback }
}
type AR = ReturnType<typeof useARState>

// ---- 3D content ------------------------------------------------------------

function MiniStore({ ar, position }: { ar: AR; position: [number, number, number] }) {
  const infoPos = ar.info ? productWorldPos(ar.info) : null
  return (
    <group position={position} rotation={[0, ar.rot, 0]} scale={ar.scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[STORE.halfW * 2, STORE.halfD * 2]} />
        <meshStandardMaterial color="#f5f0e6" />
      </mesh>
      <mesh position={[0, 0.6, -STORE.halfD]}><boxGeometry args={[STORE.halfW * 2, 1.2, 0.2]} /><meshStandardMaterial color="#ff7a45" /></mesh>
      {SHELVES.map((s) => <Shelf key={s.id} shelf={s} onPick={ar.pick} />)}
      <CheckoutCounter />
      <Text position={[0, 3.6, STORE.halfD]} fontSize={1.2} color="#e64a19" fontWeight={800}>My Supermarket</Text>
      {ar.info && infoPos && (
        <Billboard position={[infoPos[0], infoPos[1] + 1.6, infoPos[2]]} scale={1.8}>
          <mesh><planeGeometry args={[4.2, 1.4]} /><meshBasicMaterial color="#fff" transparent opacity={0.92} /></mesh>
          <Text position={[0, 0.25, 0.01]} fontSize={0.55} color="#1f2937" fontWeight={800}>{getProduct(ar.info).name}</Text>
          <Text position={[0, -0.35, 0.01]} fontSize={0.45} color="#e64a19">{`₹${getProduct(ar.info).price} · ${getProduct(ar.info).unit}`}</Text>
        </Billboard>
      )}
    </group>
  )
}

function Basket({ ar, position }: { ar: AR; position: [number, number, number] }) {
  return (
    <group position={position} scale={Math.max(0.25, ar.scale * 10)}>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.12, 0.09, 0.12, 20, 1, true]} /><meshStandardMaterial color="#ff7a45" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.09, 20]} /><meshStandardMaterial color="#e64a19" /></mesh>
      <mesh position={[0, 0.14, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.1, 0.008, 6, 20, Math.PI]} /><meshStandardMaterial color="#bf360c" /></mesh>
      {ar.basket.slice(-8).map((id, i) => (
        <mesh key={i} position={[Math.cos(i * 1.7) * 0.05, 0.03 + Math.floor(i / 4) * 0.035, Math.sin(i * 1.7) * 0.05]}>
          <sphereGeometry args={[0.02, 10, 10]} /><meshStandardMaterial color={getProduct(id).model.color} />
        </mesh>
      ))}
      <Billboard position={[0, 0.25, 0]}>
        <Text fontSize={0.04} color="#1f2937" outlineWidth={0.003} outlineColor="#fff">{`${ar.basket.length} items · ₹${ar.basket.reduce((s, id) => s + getProduct(id).price, 0)}`}</Text>
      </Billboard>
    </group>
  )
}

function MoneyOnSurface({ ar }: { ar: AR }) {
  return (
    <>
      {ar.money.map((m) => (
        <group key={m.id} position={m.pos} rotation={[-Math.PI / 2, 0, (m.id * 0.7) % 1]} scale={1.6}>
          <Money3D value={m.d} onPress={() => ar.setMoney((list) => list.filter((x) => x.id !== m.id))} />
        </group>
      ))}
    </>
  )
}

// WebXR immersive-ar: hit-test reticle and tap-to-place
const mat = new THREE.Matrix4()
function ARReticleAndTap({ ar }: { ar: AR }) {
  const reticle = useRef<THREE.Mesh>(null)
  const hit = useRef<THREE.Vector3 | null>(null)
  useXRHitTest((results, getWorldMatrix) => {
    if (!results.length || !reticle.current) { if (reticle.current) reticle.current.visible = false; return }
    getWorldMatrix(mat, results[0])
    const p = new THREE.Vector3().setFromMatrixPosition(mat)
    hit.current = p
    reticle.current.visible = true
    reticle.current.position.copy(p)
  }, 'viewer')
  useXRInputSourceEvent('all', 'select', () => {
    if (hit.current && ar.tool !== 'shop') ar.placeAt([hit.current.x, hit.current.y, hit.current.z])
  }, [ar.tool, ar.denom, ar.placeAt])
  return (
    <mesh ref={reticle} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.05, 0.065, 32]} />
      <meshBasicMaterial color={ar.tool === 'money' ? '#ffd54f' : '#ffffff'} />
    </mesh>
  )
}

function ARControls({ ar, onExit, xr }: { ar: AR; onExit: () => void; xr?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Taps on the overlay must not also count as an AR "select" (placing things).
    const el = ref.current
    const stop = (e: Event) => e.preventDefault()
    el?.addEventListener('beforexrselect', stop)
    return () => el?.removeEventListener('beforexrselect', stop)
  }, [])
  const tools: Array<[Tool, string]> = [['store', '🏪 Place store'], ['basket', '🧺 Place basket'], ['shop', '👆 Shop'], ['money', '🪙 Money table']]
  const hint = {
    store: xr ? 'Point at a table or floor and tap to place the supermarket.' : 'Tap the table to move the supermarket.',
    basket: 'Tap a surface to put your shopping basket there.',
    shop: 'Tap products on the mini shelves to learn about them and add them to your basket.',
    money: `Make ₹${ar.target}: choose a coin or note, then tap the surface to put it down. Tap money to pick it up.`,
  }[ar.tool]
  return (
    <div ref={ref} className="vs-hud pointer-events-none fixed inset-0 flex flex-col justify-between p-3 font-sans">
      <div className="pointer-events-auto flex flex-wrap gap-2">
        <button className="btn-ghost py-2" onClick={onExit}>✕ Exit AR</button>
        {tools.map(([t, label]) => <button key={t} className={`btn py-2 text-base ${ar.tool === t ? 'bg-brand text-white' : 'bg-white/90'}`} onClick={() => ar.setTool(t)}>{label}</button>)}
      </div>
      <div className="pointer-events-auto space-y-2">
        <div className="panel p-3 text-base font-bold">{hint}</div>
        {ar.tool === 'money' && (
          <div className="panel space-y-2 p-3">
            <div className="flex items-center justify-between text-lg font-extrabold"><span>Target ₹{ar.target}</span><span>On surface ₹{ar.total}</span></div>
            <div className="flex gap-1 overflow-x-auto">
              {DENOMINATIONS.map((d) => (
                <button key={d} onClick={() => ar.setDenom(d)} className={`shrink-0 rounded-xl p-1 ${ar.denom === d ? 'ring-4 ring-brand' : ''}`} aria-pressed={ar.denom === d}><MoneyPiece value={d} size={0.6} /></button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost py-2" onClick={() => ar.setMoney([])}>Clear</button>
              <button className="btn-green py-2" onClick={ar.check}>Check</button>
            </div>
            {ar.feedback && <div className="rounded-xl bg-amber-50 p-2 font-bold" role="status">{ar.feedback}</div>}
          </div>
        )}
        {(ar.tool === 'store' || ar.tool === 'shop') && (
          <div className="panel grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 p-3">
            <span className="font-bold">Size</span>
            <input type="range" min={0.01} max={0.08} step={0.005} value={ar.scale} onChange={(e) => ar.setScale(Number(e.target.value))} aria-label="Supermarket size" />
            <span className="font-bold">Turn</span>
            <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={ar.rot} onChange={(e) => ar.setRot(Number(e.target.value))} aria-label="Rotate supermarket" />
            {ar.basket.length > 0 && <span className="col-span-2 text-sm">🧺 {ar.basket.length} items · ₹{ar.basket.reduce((s, id) => s + getProduct(id).price, 0)} <button className="ml-2 font-bold text-rose-600" onClick={() => ar.setBasket([])}>empty</button></span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- camera fallback (no WebXR AR) -----------------------------------------

function CameraFeed() {
  const video = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let stream: MediaStream | null = null
    const fail = () => setErr('Camera not available — showing a play table instead.')
    // Some browsers never settle the permission prompt; fall back after a few seconds.
    const timer = setTimeout(() => { if (!stream) fail() }, 4000)
    if (!navigator.mediaDevices?.getUserMedia) fail()
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => { stream = s; setErr(null); if (video.current) { video.current.srcObject = s; void video.current.play() } })
      .catch(fail)
    return () => { clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()) }
  }, [])
  return (
    <>
      <video ref={video} className="fixed inset-0 h-full w-full object-cover" playsInline muted />
      {err && <div className="fixed inset-0 bg-[linear-gradient(#b3e5fc,#fff3e0)]" />}
      {err && <div className="panel fixed left-1/2 top-20 -translate-x-1/2 px-3 py-1 text-sm">{err}</div>}
    </>
  )
}

function FallbackScene({ ar }: { ar: AR }) {
  const onTable = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    ar.placeAt([e.point.x, 0.001, e.point.z])
  }
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[1, 3, 2]} intensity={1.5} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={onTable}>
        <circleGeometry args={[1.1, 48]} />
        <meshStandardMaterial color="#d7b48a" transparent opacity={0.55} />
      </mesh>
      <MiniStore ar={ar} position={ar.storePos ?? [0, 0.002, 0]} />
      {ar.basketPos && <Basket ar={ar} position={ar.basketPos} />}
      <MoneyOnSurface ar={ar} />
      <OrbitControls target={[0, 0.05, 0]} maxPolarAngle={Math.PI * 0.47} minDistance={0.3} maxDistance={2.5} />
    </>
  )
}

// ---- screen ------------------------------------------------------------------

export function ARScreen() {
  const goto = useSession((s) => s.goto)
  const [support, setSupport] = useState<XRSupport | null>(null)
  const [mode, setMode] = useState<'menu' | 'webxr' | 'camera'>('menu')
  const ar = useARState()
  useEffect(() => { void detectXR().then(setSupport) }, [])

  const exit = () => {
    void xrStore.getState().session?.end()
    setMode('menu')
  }

  const startWebXR = async () => {
    setMode('webxr')
    ar.setStorePos(null)
    ar.setTool('store')
    try { await xrStore.enterAR() } catch { setMode('camera') }
  }

  useEffect(() => {
    // Leaving the WebXR session (system back button) returns to the AR menu.
    return xrStore.subscribe((s, prev) => { if (prev.session && !s.session) setMode((m) => (m === 'webxr' ? 'menu' : m)) })
  }, [])

  if (mode === 'menu') {
    return (
      <ScreenShell title="AR Mode" back={() => goto('modes')}>
        <div className="panel mt-4 p-5">
          <div className="text-5xl">🪄🏪</div>
          <h2 className="mt-2 text-2xl font-extrabold">Bring the supermarket into your room</h2>
          <ul className="mt-2 list-disc pl-6 text-lg text-ink/80">
            <li>Place a miniature supermarket on a table or the floor, then resize and turn it.</li>
            <li>Walk around it and tap products to see their name and price.</li>
            <li>Put a virtual basket next to it and fill it up.</li>
            <li>Money table: put coins and notes on a real surface to make an amount.</li>
          </ul>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button className="btn-primary py-4" disabled={!support?.ar} onClick={() => void startWebXR()}>
              📱 Start AR {support && !support.ar && '(not supported here)'}
            </button>
            <button className="btn-ghost py-4" onClick={() => { ar.setTool('shop'); setMode('camera') }}>📷 Camera mode (works everywhere)</button>
          </div>
          <p className="mt-3 text-sm text-ink/60">
            Full AR needs Chrome on an ARCore Android phone (or Meta Quest browser) over HTTPS. On iPhone and desktop, camera mode shows the store over your camera view instead.
            Please ask a grown-up and play in a safe, clear space.
          </p>
        </div>
      </ScreenShell>
    )
  }

  if (mode === 'camera') {
    return (
      <div className="fixed inset-0">
        <CameraFeed />
        <Canvas className="!fixed inset-0" gl={{ alpha: true }} camera={{ position: [0, 0.85, 1.25], fov: 55, near: 0.01 }} style={{ background: 'transparent' }}>
          <XR store={xrStore}><FallbackScene ar={ar} /></XR>
        </Canvas>
        <ARControls ar={ar} onExit={exit} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-ink">
      <Canvas camera={{ near: 0.01 }}>
        <XR store={xrStore}>
          <ambientLight intensity={1} />
          <directionalLight position={[1, 3, 2]} intensity={1.5} />
          <IfInSessionMode allow="immersive-ar">
            <ARReticleAndTap ar={ar} />
            {ar.storePos && <MiniStore ar={ar} position={ar.storePos} />}
            {ar.basketPos && <Basket ar={ar} position={ar.basketPos} />}
            <MoneyOnSurface ar={ar} />
            <XRDomOverlay><ARControls ar={ar} onExit={exit} xr /></XRDomOverlay>
          </IfInSessionMode>
        </XR>
      </Canvas>
      <div className="fixed inset-0 grid place-items-center p-6 text-center text-white">
        <div><div className="text-5xl">📱</div><p className="mt-2 text-xl">Starting AR… move your phone slowly to find a surface.</p><button className="btn-ghost mt-4" onClick={exit}>Cancel</button></div>
      </div>
    </div>
  )
}

