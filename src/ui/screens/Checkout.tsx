import { useState } from 'react'
import { DENOMINATIONS } from '../../data/currency'
import { getProduct } from '../../data/products'
import { billTotal } from '../../engine/checkout'
import { breakdown, purseTotal } from '../../engine/money'
import { describePieces } from '../../engine/questions'
import { useSession } from '../../store/sessionStore'
import { Keypad } from '../components/Kit'
import { DraggableMoney, MoneyTray } from '../components/Money'

function Steps({ phase }: { phase: string }) {
  const steps = [['scan', 'Scan'], ['method', 'Pay'], ['change', 'Change'], ['receipt', 'Receipt']] as const
  const order = { scan: 0, method: 1, cash: 1, card: 1, change: 2, receipt: 3 } as Record<string, number>
  return (
    <ol className="mb-3 flex gap-1" aria-label="Checkout steps">
      {steps.map(([k, label], i) => (
        <li key={k} className={`flex-1 rounded-full py-1 text-center text-sm font-bold ${i < order[phase] ? 'bg-emerald-500 text-white' : i === order[phase] ? 'bg-brand text-white' : 'bg-black/10 text-ink/50'}`}>{label}</li>
      ))}
    </ol>
  )
}

function BillList() {
  const c = useSession((s) => s.checkout)!
  return (
    <div className="rounded-2xl bg-slate-900 p-3 font-mono text-sm text-emerald-300">
      <div className="mb-1 text-xs text-emerald-500">BILL</div>
      {c.bill.length === 0 && <div className="text-emerald-700">Nothing scanned yet…</div>}
      {c.bill.map((l) => (
        <div key={l.productId} className="flex justify-between anim-rise"><span>{l.name} × {l.qty} @ ₹{l.price}</span><span>₹{l.subtotal}</span></div>
      ))}
      <div className="mt-1 flex justify-between border-t border-emerald-800 pt-1 text-lg font-bold text-emerald-200"><span>TOTAL</span><span>₹{billTotal(c.bill)}</span></div>
    </div>
  )
}

function ScanStep() {
  const c = useSession((s) => s.checkout)!
  const scanItem = useSession((s) => s.scanItem)
  const back = useSession((s) => s.backToShopping)
  const [dragId, setDragId] = useState<string | null>(null)
  return (
    <div>
      <p className="mb-2 text-lg">Tap each item (or drag it onto the red scanner) to scan it. The scanner counts how many you have.</p>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="flex flex-wrap gap-2">
          {c.queue.map((l) => {
            const p = getProduct(l.productId)
            return (
              <button key={l.productId} draggable onDragStart={() => setDragId(l.productId)} onDragEnd={() => setDragId(null)}
                onClick={() => scanItem(l.productId)} className="btn-ghost flex-col px-3 py-2 anim-pop">
                <span className="text-3xl">{p.image}</span>
                <span className="text-sm">{p.name} ×{l.qty}</span>
              </button>
            )
          })}
        </div>
        <div className="grid w-28 place-items-center rounded-2xl bg-slate-800 p-2 text-center text-white"
          onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) scanItem(dragId) }}>
          <div className="h-2 w-20 animate-pulse rounded-full bg-red-500 shadow-[0_0_12px_#f00]" />
          <span className="mt-1 text-sm font-bold">Scanner</span>
        </div>
      </div>
      {c.bill.length === 0 && <button className="mt-2 text-sm font-bold text-ink/60 underline" onClick={back}>← I forgot something</button>}
    </div>
  )
}

function MethodStep() {
  const choose = useSession((s) => s.chooseMethod)
  const cardBalance = useSession((s) => s.cardBalance)
  return (
    <div>
      <p className="mb-3 text-lg">How would you like to pay?</p>
      <div className="grid grid-cols-3 gap-2">
        <button className="btn-primary flex-col py-4" onClick={() => choose('cash')}><span className="text-4xl">💵</span>Cash</button>
        <button className="btn-blue flex-col py-4" onClick={() => choose('card')} disabled={cardBalance <= 0}><span className="text-4xl">💳</span>Card</button>
        <button className="btn flex-col bg-violet-700 py-4 text-white" onClick={() => choose('upi')} disabled={cardBalance <= 0}><span className="text-4xl">📱</span>UPI</button>
      </div>
      {cardBalance <= 0 && <p className="mt-2 text-sm text-ink/60">In the budget challenge you pay with the cash in your wallet.</p>}
    </div>
  )
}

function CashStep() {
  const s = useSession()
  const c = s.checkout!
  const total = billTotal(c.bill)
  const given = purseTotal(c.tray)
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between text-lg"><span>Pay <b className="text-2xl">₹{total}</b></span><span className="text-ink/60">Wallet ₹{purseTotal(s.wallet)}</span></div>
      <MoneyTray purse={c.tray} dropName="pay-tray" onRemove={s.trayRemove} label="Money for the cashier" highlight={given >= total ? 'ok' : null} />
      <div>
        <div className="mb-1 text-sm font-bold text-ink/60">Your wallet — drag or tap</div>
        <div className="flex flex-wrap items-center gap-1">
          {DENOMINATIONS.slice().reverse().map((d) => {
            const left = (s.wallet[d] ?? 0) - (c.tray[d] ?? 0)
            if ((s.wallet[d] ?? 0) === 0) return null
            return <DraggableMoney key={d} value={d} dropName="pay-tray" onDrop={s.trayAdd} disabled={left <= 0} count={left} size={0.8} />
          })}
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button className="btn-ghost" onClick={() => s.chooseMethod('cash')}>Clear</button>
        <button className="btn-green" onClick={s.payCash} disabled={given === 0}>Pay ₹{given}</button>
      </div>
    </div>
  )
}

function CardStep() {
  const s = useSession()
  const c = s.checkout!
  const [value, setValue] = useState('')
  return (
    <div>
      <p className="mb-2 text-lg">{c.method === 'upi' ? '📱 Scan & pay with UPI.' : '💳 Card payment.'} Type the bill total on the machine, then press ✓. Balance: <b>₹{s.cardBalance}</b></p>
      <Keypad value={value} onChange={setValue} onSubmit={() => { s.payCard(Number(value)); setValue('') }} submitLabel="Pay" />
      <button className="mt-2 text-sm font-bold text-ink/60 underline" onClick={() => s.chooseMethod('cash')}>Pay with cash instead</button>
    </div>
  )
}

function ChangeStep() {
  const s = useSession()
  const c = s.checkout!
  const [hint, setHint] = useState(false)
  const counted = purseTotal(c.changeTray)
  return (
    <div className="space-y-3">
      <p className="text-lg">You paid <b>₹{c.paid}</b> for a bill of <b>₹{billTotal(c.bill)}</b>. Help Priya count your change: <b className="text-2xl text-brand-dark">₹{c.paid} − ₹{billTotal(c.bill)} = ?</b></p>
      <MoneyTray purse={c.changeTray} dropName="change-tray" onRemove={s.changeRemove} label="Your change" highlight={counted === c.changeDue ? 'ok' : counted > c.changeDue ? 'bad' : null} />
      <div>
        <div className="mb-1 text-sm font-bold text-ink/60">Cash drawer</div>
        <div className="flex flex-wrap items-center gap-1">
          {DENOMINATIONS.filter((d) => d <= Math.max(c.changeDue, 1) * 2 || d <= 10).slice().reverse().map((d) => (
            <DraggableMoney key={d} value={d} dropName="change-tray" onDrop={s.changeAdd} size={0.8} />
          ))}
        </div>
      </div>
      {hint && <p className="rounded-xl bg-amber-50 p-2 text-sm">💡 Count up from ₹{billTotal(c.bill)} to ₹{c.paid}. One way: {describePieces(c.changeDue)} ({Object.values(breakdown(c.changeDue)).reduce((a, b) => a + (b ?? 0), 0)} pieces).</p>}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button className="btn-ghost" onClick={() => setHint(true)}>💡 Hint</button>
        <button className="btn-green" onClick={s.confirmChange} disabled={counted === 0}>This is my change (₹{counted})</button>
      </div>
    </div>
  )
}

function ReceiptStep() {
  const s = useSession()
  const r = s.checkout!.receipt!
  return (
    <div>
      <div className="mx-auto max-w-xs bg-white p-4 font-mono text-sm shadow-inner anim-print" style={{ backgroundImage: 'repeating-linear-gradient(#fff 0 22px, #fafafa 22px 23px)' }}>
        <div className="text-center font-bold">MY SUPERMARKET</div>
        <div className="text-center text-xs">Receipt {r.number} · {new Date(r.at).toLocaleString('en-IN')}</div>
        <div className="my-2 border-t border-dashed" />
        {r.lines.map((l) => <div key={l.productId} className="flex justify-between"><span>{l.name} ×{l.qty}</span><span>₹{l.subtotal}</span></div>)}
        <div className="my-2 border-t border-dashed" />
        <div className="flex justify-between font-bold"><span>TOTAL</span><span>₹{r.total}</span></div>
        <div className="flex justify-between"><span>Paid ({r.method.toUpperCase()})</span><span>₹{r.paid}</span></div>
        <div className="flex justify-between"><span>Change</span><span>₹{r.change}</span></div>
        <div className="mt-2 text-center text-xs">Thank you for shopping! 🛍️</div>
      </div>
      <button className="btn-green mt-3 w-full py-4 text-2xl" onClick={s.finishShop}>Take my bags & finish 🎉</button>
    </div>
  )
}

export function CheckoutOverlay() {
  const c = useSession((s) => s.checkout)
  const msg = useSession((s) => s.checkoutMsg)
  if (!c) return null
  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 top-16 z-10 flex w-[min(96vw,30rem)] flex-col overflow-auto">
      <div className="panel p-4">
        <Steps phase={c.phase} />
        <BillList />
        {msg && <div key={msg.at} className={`mt-2 rounded-xl px-3 py-2 font-bold ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700 anim-shake'}`} role="status">{msg.text}</div>}
        <div className="mt-3">
          {c.phase === 'scan' && <ScanStep />}
          {c.phase === 'method' && <MethodStep />}
          {c.phase === 'cash' && <CashStep />}
          {c.phase === 'card' && <CardStep />}
          {c.phase === 'change' && <ChangeStep />}
          {c.phase === 'receipt' && <ReceiptStep />}
        </div>
      </div>
    </div>
  )
}
