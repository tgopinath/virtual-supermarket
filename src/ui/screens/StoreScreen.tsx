import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useState } from 'react'
import { DEPARTMENTS, departmentOf, getProduct } from '../../data/products'
import { cartCount, cartTotal, compareProducts, lineSubtotal, qtyOf, MAX_QTY } from '../../engine/cart'
import { evaluate } from '../../engine/challenges'
import { SupermarketCanvas } from '../../three/SupermarketScene'
import { ProductModel } from '../../three/ProductModel'
import { useSession } from '../../store/sessionStore'
import { detectXR, xrStore, type XRSupport } from '../../xr/xrStore'
import { Bar, BuddyBubble, Modal } from '../components/Kit'
import { CheckoutOverlay } from './Checkout'

function useXRSupport() {
  const [support, setSupport] = useState<XRSupport>({ vr: false, ar: false })
  useEffect(() => { void detectXR().then(setSupport) }, [])
  return support
}

function Timer() {
  const challenge = useSession((s) => s.challenge)
  const startedAt = useSession((s) => s.startedAt)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!challenge?.timeLimit || !startedAt) return
    const t = setInterval(() => {
      tick((n) => n + 1)
      if (useSession.getState().elapsedSec() >= challenge.timeLimit!) useSession.getState().timeUp()
    }, 250)
    return () => clearInterval(t)
  }, [challenge, startedAt])
  if (!challenge?.timeLimit) return null
  const left = Math.max(0, Math.ceil(challenge.timeLimit - useSession.getState().elapsedSec()))
  return (
    <span className={`chip text-lg ${left <= 20 && startedAt ? 'animate-pulse bg-rose-600 text-white' : 'bg-ink text-white'}`} role="timer" aria-label={`${left} seconds left`}>
      ⏱️ {startedAt ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${challenge.timeLimit}s`}
    </span>
  )
}

function TopBar({ support }: { support: XRSupport }) {
  const s = useSession()
  const total = cartTotal(s.cart)
  const budget = s.challenge?.budget
  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-3">
      <button className="btn-ghost px-3 py-2" onClick={() => setConfirm(true)} aria-label="Leave the store">← Exit</button>
      <span className="chip bg-white/90 text-base shadow">{s.challenge?.title}{s.level ? ` · Level ${s.level}` : ''}</span>
      <Timer />
      {budget != null && (
        <div className={`panel flex min-w-52 flex-col px-3 py-1.5 ${total > budget ? 'anim-shake ring-2 ring-rose-500' : ''}`}>
          <div className="flex justify-between text-sm font-bold"><span>Budget ₹{budget}</span><span className={total > budget ? 'text-rose-600' : 'text-emerald-700'}>{total > budget ? `Over by ₹${total - budget}!` : `Left ₹${budget - total}`}</span></div>
          <Bar value={total / budget} color={total > budget ? 'bg-rose-500' : total > budget * 0.85 ? 'bg-amber-500' : 'bg-emerald-500'} />
        </div>
      )}
      <span className="flex-1" />
      {support.vr && <button className="btn-blue py-2" onClick={() => void xrStore.enterVR()}>🥽 Enter VR</button>}
      <button className="btn-ghost py-2" onClick={() => s.flyTo('overview')} title="See the whole store">🗺️ Map</button>
    </div>
  )
  function setConfirm(v: boolean) {
    if (v && window.confirm('Leave the supermarket? Your trolley will be emptied.')) s.leaveStore()
  }
}

function ShoppingList() {
  const challenge = useSession((s) => s.challenge)
  const cart = useSession((s) => s.cart)
  const flyTo = useSession((s) => s.flyTo)
  const say = useSession((s) => s.say)
  const [open, setOpen] = useState(true)
  if (!challenge || (!challenge.list.length && !challenge.healthy)) return null
  const ev = evaluate(challenge, cart)
  const done = ev.items.filter((i) => i.have === i.need).length
  return (
    <div className="panel pointer-events-auto w-64 p-3">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="text-lg font-extrabold">📝 {challenge.healthy ? 'Healthy basket' : 'Shopping list'}</span>
        <span className="text-sm text-ink/60">{challenge.healthy ? `${ev.healthy!.checks.filter((c) => c.ok).length}/4` : `${done}/${ev.items.length}`}</span>
      </button>
      {open && (
        <>
          {!challenge.healthy && <div className="my-2"><Bar value={done / ev.items.length} color="bg-emerald-500" /></div>}
          <ul className="space-y-1">
            {ev.items.map((i) => {
              const p = getProduct(i.productId)
              return (
                <li key={i.productId}>
                  <button className={`flex w-full items-center gap-2 rounded-xl px-2 py-1 text-left hover:bg-orange-50 ${i.over ? 'text-rose-600' : ''}`}
                    onClick={() => { flyTo(p.department); say(`${p.name} is in the ${departmentOf(p.department).name} aisle. You need ${i.need}.`) }}
                    title="Help me find it">
                    <span className="text-2xl">{p.image}</span>
                    <span className={`flex-1 font-bold ${i.have === i.need ? 'line-through opacity-60' : ''}`}>Buy {i.need} {p.name}</span>
                    <span className="text-sm">{i.have === i.need ? '✅' : `${i.have}/${i.need}`}</span>
                  </button>
                </li>
              )
            })}
            {ev.healthy?.checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2 px-2 py-1 text-sm font-bold"><span>{c.ok ? '✅' : '⬜'}</span>{c.label}</li>
            ))}
          </ul>
          {ev.healthy && (
            <p className="mt-2 text-xs text-ink/60">Fruit/veg {ev.healthy.fruitVeg} · Dairy/protein {ev.healthy.dairyProtein} · Grains {ev.healthy.grain} · Treats {ev.healthy.sometimes}</p>
          )}
          <p className="mt-2 text-xs text-ink/50">Tap an item and ShopBuddy will take you to its aisle.</p>
        </>
      )}
    </div>
  )
}

function DepartmentBar() {
  const target = useSession((s) => s.camera.target)
  const flyTo = useSession((s) => s.flyTo)
  const goCheckout = useSession((s) => s.goCheckout)
  return (
    <nav className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto p-2 [scrollbar-width:none]" aria-label="Departments">
      <button className={`btn shrink-0 px-3 py-2 text-base ${target === 'entrance' ? 'bg-ink text-white' : 'bg-white'}`} onClick={() => flyTo('entrance')}>🚪 Entrance</button>
      {DEPARTMENTS.map((d) => (
        <button key={d.id} onClick={() => flyTo(d.id)} aria-current={target === d.id}
          className="btn shrink-0 px-3 py-2 text-base text-white" style={{ background: d.color, outline: target === d.id ? '4px solid #1f2937' : undefined }}>
          {d.icon} {d.name}
        </button>
      ))}
      <button className="btn-green shrink-0 px-3 py-2 text-base" onClick={goCheckout}>💳 Checkout</button>
    </nav>
  )
}

function TrolleyButton() {
  const cart = useSession((s) => s.cart)
  const dragging = useSession((s) => s.dragging)
  const lastAdded = useSession((s) => s.lastAdded)
  const setCartOpen = useSession((s) => s.setCartOpen)
  return (
    <button data-drop="cart" onClick={() => setCartOpen(true)} key={lastAdded?.at}
      className={`pointer-events-auto relative grid h-24 w-24 place-items-center rounded-full bg-brand text-white shadow-2xl transition ${dragging ? 'scale-125 ring-8 ring-amber-300' : ''} ${lastAdded ? 'anim-pop' : ''}`}
      aria-label={`Trolley: ${cartCount(cart)} items, ₹${cartTotal(cart)}. Open cart.`}>
      <span className="text-4xl">🛒</span>
      <span className="absolute -top-1 -right-1 grid h-9 min-w-9 place-items-center rounded-full bg-ink px-1 text-lg font-extrabold">{cartCount(cart)}</span>
      <span className="absolute -bottom-2 rounded-full bg-white px-2 text-sm font-extrabold text-ink shadow">₹{cartTotal(cart)}</span>
      {dragging && <span className="absolute -top-10 whitespace-nowrap rounded-full bg-amber-300 px-2 font-bold text-ink">Drop here!</span>}
    </button>
  )
}

export function ProductPreview({ id, height = 160 }: { id: string; height?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-orange-50 to-white" style={{ height }} title="Drag to rotate">
      <Canvas camera={{ position: [0, 0.18, 0.5], fov: 40 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[2, 3, 2]} intensity={1.6} />
        <group scale={0.22 / getProduct(id).model.size} position={[0, -0.08, 0]}>
          <ProductModel product={getProduct(id)} detail={24} />
        </group>
        <OrbitControls autoRotate autoRotateSpeed={3} enablePan={false} enableZoom={false} target={[0, 0.02, 0]} />
      </Canvas>
    </div>
  )
}

function ProductPanel() {
  const id = useSession((s) => s.selected)
  const compareId = useSession((s) => s.compareId)
  const cart = useSession((s) => s.cart)
  const { addToCart, select, setCompare, setLineQty } = useSession.getState()
  const [qty, setQty] = useState(1)
  useEffect(() => setQty(1), [id])
  if (!id) return null
  const p = getProduct(id)
  const inCart = qtyOf(cart, id)
  const health = { everyday: ['🟢 Everyday food', 'bg-emerald-100 text-emerald-800'], sometimes: ['🟠 Sometimes food', 'bg-amber-100 text-amber-800'], 'non-food': ['🧽 Not food', 'bg-slate-100 text-slate-700'] }[p.health]
  return (
    <div className="panel pointer-events-auto w-[min(92vw,22rem)] p-4 anim-rise">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: departmentOf(p.department).color }}>{departmentOf(p.department).name}</div>
          <h2 className="text-3xl font-extrabold leading-tight">{p.image} {p.name}</h2>
        </div>
        <button className="btn-ghost px-3 py-1" onClick={() => select(null)} aria-label="Close">✕</button>
      </div>
      <ProductPreview id={id} />
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-4xl font-extrabold text-brand-dark">₹{p.price}</span>
        <span className="text-lg text-ink/60">for {p.unit}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        <span className={`chip ${health[1]}`}>{health[0]}</span>
        <span className="chip bg-slate-100 font-mono text-xs text-slate-600">▌▌▍▌ {p.barcode}</span>
      </div>
      <p className="mt-2 text-ink/80">{p.info}</p>
      <div className="mt-3 flex items-center gap-2">
        <button className="btn-ghost h-12 w-12 p-0 text-2xl" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Fewer">−</button>
        <span className="w-10 text-center text-2xl font-extrabold" aria-live="polite">{qty}</span>
        <button className="btn-ghost h-12 w-12 p-0 text-2xl" onClick={() => setQty(Math.min(MAX_QTY, qty + 1))} aria-label="More">+</button>
        <span className="flex-1 text-right text-lg font-bold">= ₹{p.price * qty}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-primary" onClick={() => { addToCart(id, qty); select(null) }}>🛒 Add {qty}</button>
        <button className="btn-ghost" onClick={() => { setCompare(id); select(null); useSession.getState().say(`Now tap another product to compare with ${p.name}.`, 'thinking') }}>⚖️ Compare</button>
      </div>
      {inCart > 0 && (
        <button className="mt-2 w-full text-sm font-bold text-rose-600" onClick={() => setLineQty(id, inCart - 1)}>
          You have {inCart} in your trolley · take one out
        </button>
      )}
      {compareId && compareId !== id && <CompareBox a={compareId} b={id} />}
    </div>
  )
}

function CompareBox({ a, b }: { a: string; b: string }) {
  const pa = getProduct(a), pb = getProduct(b)
  const cmp = compareProducts(pa, pb)
  const setCompare = useSession((s) => s.setCompare)
  return (
    <div className="mt-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
      <div className="mb-1 flex items-center justify-between font-extrabold"><span>⚖️ Compare</span><button className="text-sm text-ink/50" onClick={() => setCompare(null)}>clear</button></div>
      <div className="grid grid-cols-2 gap-2 text-center">
        {[pa, pb].map((p) => (
          <div key={p.id} className={`rounded-xl bg-white p-2 ${cmp.cheaper?.id === p.id ? 'ring-2 ring-emerald-500' : ''}`}>
            <div className="text-3xl">{p.image}</div>
            <div className="font-bold">{p.name}</div>
            <div className="text-xl font-extrabold">₹{p.price}</div>
            <div className="text-xs text-ink/60">{p.unit}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm">
        {cmp.cheaper ? <><b>{cmp.cheaper.name}</b> is cheaper by <b>₹{cmp.difference}</b>.</> : 'They cost the same!'}
        {cmp.perUnit && <> Per {cmp.perUnit.base}: {pa.name} ₹{cmp.perUnit.a}, {pb.name} ₹{cmp.perUnit.b}{cmp.perUnit.betterValue ? <> → <b>{cmp.perUnit.betterValue.name}</b> is better value.</> : '.'}</>}
      </p>
    </div>
  )
}

function CartPanel() {
  const open = useSession((s) => s.cartOpen)
  const cart = useSession((s) => s.cart)
  const phase = useSession((s) => s.phase)
  const { setCartOpen, setLineQty, removeLine, goCheckout } = useSession.getState()
  if (!open) return null
  return (
    <Modal title="🛒 My trolley" onClose={() => setCartOpen(false)}>
      {cart.length === 0 ? <p className="py-6 text-center text-lg text-ink/60">Your trolley is empty. Tap a product on a shelf!</p> : (
        <table className="w-full text-left">
          <thead className="text-sm text-ink/60"><tr><th>Product</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Subtotal</th><th /></tr></thead>
          <tbody>
            {cart.map((l) => {
              const p = getProduct(l.productId)
              return (
                <tr key={l.productId} className="border-t border-black/5">
                  <td className="py-2 font-bold">{p.image} {p.name}</td>
                  <td className="text-center">
                    <div className="inline-flex items-center gap-1">
                      <button className="btn-ghost h-8 w-8 p-0" onClick={() => setLineQty(l.productId, l.qty - 1)} aria-label={`Fewer ${p.name}`} disabled={phase !== 'shopping'}>−</button>
                      <span className="w-6 text-center font-extrabold">{l.qty}</span>
                      <button className="btn-ghost h-8 w-8 p-0" onClick={() => setLineQty(l.productId, l.qty + 1)} aria-label={`More ${p.name}`} disabled={phase !== 'shopping' || l.qty >= MAX_QTY}>+</button>
                    </div>
                  </td>
                  <td className="text-right">₹{p.price}</td>
                  <td className="text-right font-bold">₹{lineSubtotal(l)}</td>
                  <td className="text-right"><button className="px-2 text-rose-600" onClick={() => removeLine(l.productId)} aria-label={`Remove ${p.name}`} disabled={phase !== 'shopping'}>🗑️</button></td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr className="border-t-2 border-ink/20 text-xl"><td className="pt-2 font-extrabold" colSpan={3}>Total ({cartCount(cart)} items)</td><td className="pt-2 text-right font-extrabold">₹{cartTotal(cart)}</td><td /></tr></tfoot>
        </table>
      )}
      {phase === 'shopping' && cart.length > 0 && <button className="btn-green mt-4 w-full" onClick={goCheckout}>Go to checkout →</button>}
    </Modal>
  )
}

function OutsideOverlay() {
  const challenge = useSession((s) => s.challenge)
  const enterStore = useSession((s) => s.enterStore)
  return (
    <div className="pointer-events-auto panel mx-auto max-w-md p-5 text-center anim-pop">
      <div className="text-5xl">🏪</div>
      <h2 className="text-3xl font-extrabold">{challenge?.title}</h2>
      {challenge?.budget && <p className="text-xl">Your budget: <b>₹{challenge.budget}</b></p>}
      {challenge?.timeLimit && <p className="text-xl">Time limit: <b>{challenge.timeLimit} seconds</b></p>}
      {challenge?.list.length ? <p className="text-ink/70">{challenge.list.length} items on your list.</p> : null}
      <button className="btn-primary mt-4 w-full py-4 text-2xl" onClick={enterStore}>Enter the store 🚪</button>
    </div>
  )
}

export function StoreScreen() {
  const phase = useSession((s) => s.phase)
  const screen = useSession((s) => s.screen)
  const support = useXRSupport()
  const [ready, setReady] = useState({ n: 0, total: 7 })
  const onReady = useCallback((n: number, total: number) => setReady({ n, total }), [])
  const playing = screen === 'store'

  return (
    <div className="fixed inset-0 select-none">
      <SupermarketCanvas onReady={onReady} />
      {ready.n < ready.total && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-cream">
          <div className="w-64 text-center">
            <div className="text-6xl anim-float">🛒</div>
            <p className="mt-2 text-xl font-bold">Stocking the shelves…</p>
            <div className="mt-2"><Bar value={ready.n / ready.total} /></div>
          </div>
        </div>
      )}
      {playing && (
        <div className="vs-hud pointer-events-none absolute inset-0 flex flex-col">
          <TopBar support={support} />
          <div className="flex flex-1 items-start justify-between gap-3 overflow-hidden px-3">
            <div className="flex flex-col gap-3">{phase !== 'checkout' && <ShoppingList />}</div>
            <div className="flex flex-col items-end gap-3"><ProductPanel /></div>
          </div>
          {phase === 'outside' && <div className="absolute inset-x-0 top-1/3 px-4"><OutsideOverlay /></div>}
          {phase === 'checkout' && <CheckoutOverlay />}
          <div className="flex items-end justify-between gap-3 p-3">
            <BuddyBubble compact />
            {phase === 'shopping' && <TrolleyButton />}
          </div>
          {phase === 'shopping' && <DepartmentBar />}
        </div>
      )}
      <CartPanel />
    </div>
  )
}
