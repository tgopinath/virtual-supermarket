import type { Purse } from '../data/currency'
import { getProduct } from '../data/products'
import { cartTotal, type CartLine } from './cart'
import { checkPayment, containsPurse, purseTotal } from './money'

export interface BillLine {
  productId: string
  name: string
  qty: number
  price: number
  subtotal: number
  barcode: string
}

export type PayMethod = 'cash' | 'card' | 'upi'
export type CheckoutPhase = 'scan' | 'method' | 'cash' | 'card' | 'change' | 'receipt'

export interface Receipt {
  number: string
  at: number
  lines: BillLine[]
  total: number
  method: PayMethod
  paid: number
  change: number
}

export interface CheckoutState {
  phase: CheckoutPhase
  queue: CartLine[]
  bill: BillLine[]
  method: PayMethod | null
  tray: Purse
  paid: number
  changeDue: number
  changeTray: Purse
  receipt: Receipt | null
}

export type Result<T> = { ok: true; state: T; message: string } | { ok: false; message: string }

export function startCheckout(cart: CartLine[]): CheckoutState {
  if (!cart.length) throw new Error('Cannot check out an empty trolley')
  return { phase: 'scan', queue: cart.map((l) => ({ ...l })), bill: [], method: null, tray: {}, paid: 0, changeDue: 0, changeTray: {}, receipt: null }
}

export const billTotal = (bill: BillLine[]) => bill.reduce((s, l) => s + l.subtotal, 0)

/** Scan one trolley line: the scanner reads the barcode and counts the quantity. */
export function scan(state: CheckoutState, productId: string): Result<CheckoutState> {
  if (state.phase !== 'scan') return { ok: false, message: 'Scanning is finished.' }
  const line = state.queue.find((l) => l.productId === productId)
  if (!line) return { ok: false, message: 'That item is already scanned.' }
  const p = getProduct(productId)
  const billLine: BillLine = { productId, name: p.name, qty: line.qty, price: p.price, subtotal: p.price * line.qty, barcode: p.barcode }
  const queue = state.queue.filter((l) => l.productId !== productId)
  const bill = [...state.bill, billLine]
  return {
    ok: true,
    state: { ...state, queue, bill, phase: queue.length ? 'scan' : 'method' },
    message: `${p.name} × ${line.qty} = ₹${billLine.subtotal}`,
  }
}

export function chooseMethod(state: CheckoutState, method: PayMethod): Result<CheckoutState> {
  if (state.phase !== 'method' && state.phase !== 'cash' && state.phase !== 'card') return { ok: false, message: 'Finish scanning first.' }
  return { ok: true, state: { ...state, method, phase: method === 'cash' ? 'cash' : 'card', tray: {} }, message: '' }
}

/** Hand over the cash in the tray. Validates the wallet really holds it and that it covers the bill. */
export function payCash(state: CheckoutState, wallet: Purse): Result<CheckoutState> {
  const total = billTotal(state.bill)
  if (state.phase !== 'cash') return { ok: false, message: 'Choose cash first.' }
  if (!containsPurse(wallet, state.tray)) return { ok: false, message: 'You do not have that money in your wallet.' }
  const check = checkPayment(state.tray, total)
  if (!check.ok) return { ok: false, message: `That is ₹${check.paid}. You need ₹${check.short} more.` }
  const next: CheckoutState = { ...state, paid: check.paid, changeDue: check.change, phase: check.change > 0 ? 'change' : 'receipt' }
  const tip = check.extraPieces.length ? ` Tip: you could have kept your ₹${check.extraPieces[check.extraPieces.length - 1]}.` : ''
  if (next.phase === 'receipt') next.receipt = makeReceipt(next)
  return { ok: true, state: next, message: check.change > 0 ? `You paid ₹${check.paid}. Now count your change: ₹${check.change}.${tip}` : 'Exact money – perfect!' }
}

/** Card / UPI: the child types the bill amount on the terminal; it must match and the balance must cover it. */
export function payCard(state: CheckoutState, entered: number, balance: number): Result<CheckoutState> {
  const total = billTotal(state.bill)
  if (state.phase !== 'card') return { ok: false, message: 'Choose card or UPI first.' }
  if (entered !== total) return { ok: false, message: entered < total ? `₹${entered} is less than the bill. Look at the total again.` : `₹${entered} is more than the bill. Type the exact total.` }
  if (balance < total) return { ok: false, message: `Not enough balance. You have ₹${balance}.` }
  const next: CheckoutState = { ...state, paid: total, changeDue: 0, phase: 'receipt' }
  next.receipt = makeReceipt(next)
  return { ok: true, state: next, message: 'Payment approved!' }
}

/** The child counts the change back from the cashier's drawer. */
export function confirmChange(state: CheckoutState): Result<CheckoutState> {
  if (state.phase !== 'change') return { ok: false, message: 'No change is due.' }
  const given = purseTotal(state.changeTray)
  if (given !== state.changeDue) {
    return { ok: false, message: given < state.changeDue ? `That is ₹${given}. Add ₹${state.changeDue - given} more.` : `That is ₹${given}. Take back ₹${given - state.changeDue}.` }
  }
  const next: CheckoutState = { ...state, phase: 'receipt' }
  next.receipt = makeReceipt(next)
  return { ok: true, state: next, message: 'Correct change!' }
}

function makeReceipt(state: CheckoutState): Receipt {
  const at = Date.now()
  return {
    number: `MS-${String(at).slice(-6)}`,
    at,
    lines: state.bill,
    total: billTotal(state.bill),
    method: state.method ?? 'cash',
    paid: state.paid,
    change: state.changeDue,
  }
}

/** Sanity check used by tests and the UI: the bill must equal the trolley. */
export const billMatchesCart = (bill: BillLine[], cart: CartLine[]) => billTotal(bill) === cartTotal(cart)
