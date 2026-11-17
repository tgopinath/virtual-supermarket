import { DENOMINATIONS, type Denomination, type Purse } from '../data/currency'

export const purseTotal = (purse: Purse): number =>
  DENOMINATIONS.reduce((sum, d) => sum + d * (purse[d] ?? 0), 0)

export const purseCount = (purse: Purse): number =>
  DENOMINATIONS.reduce((sum, d) => sum + (purse[d] ?? 0), 0)

export const addToPurse = (purse: Purse, d: Denomination, n = 1): Purse => ({ ...purse, [d]: (purse[d] ?? 0) + n })

export const removeFromPurse = (purse: Purse, d: Denomination, n = 1): Purse => {
  const have = purse[d] ?? 0
  if (have < n) throw new Error(`Not enough ₹${d} in purse`)
  const next = { ...purse, [d]: have - n }
  if (next[d] === 0) delete next[d]
  return next
}

/** Subtract every piece of `b` from `a`. Throws if `a` does not contain `b`. */
export const subtractPurse = (a: Purse, b: Purse): Purse =>
  DENOMINATIONS.reduce((acc, d) => ((b[d] ?? 0) > 0 ? removeFromPurse(acc, d, b[d]) : acc), { ...a })

export const mergePurse = (a: Purse, b: Purse): Purse =>
  DENOMINATIONS.reduce((acc, d) => ((b[d] ?? 0) > 0 ? addToPurse(acc, d, b[d]) : acc), { ...a })

export const containsPurse = (a: Purse, b: Purse) => DENOMINATIONS.every((d) => (a[d] ?? 0) >= (b[d] ?? 0))

/** Fewest pieces that make `amount`, assuming unlimited supply (greedy is optimal for INR). */
export function breakdown(amount: number): Purse {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Amount must be a whole, non-negative number of rupees')
  const out: Purse = {}
  let left = amount
  for (const d of [...DENOMINATIONS].reverse()) {
    const n = Math.floor(left / d)
    if (n > 0) {
      out[d] = n
      left -= n * d
    }
  }
  return out
}

/**
 * Exact amount from a limited purse using the fewest pieces (bounded DP).
 * Returns null if the amount cannot be made exactly.
 */
export function makeExact(amount: number, purse: Purse): Purse | null {
  if (amount === 0) return {}
  const INF = Number.MAX_SAFE_INTEGER
  const best: number[] = new Array(amount + 1).fill(INF)
  const pick: Array<Purse | null> = new Array(amount + 1).fill(null)
  best[0] = 0
  pick[0] = {}
  for (const d of DENOMINATIONS) {
    const count = purse[d] ?? 0
    for (let k = 0; k < count; k++) {
      for (let v = amount; v >= d; v--) {
        if (best[v - d] !== INF && best[v - d] + 1 < best[v]) {
          best[v] = best[v - d] + 1
          pick[v] = addToPurse(pick[v - d]!, d)
        }
      }
    }
  }
  return best[amount] === INF ? null : pick[amount]
}

export type PaymentCheck =
  | { ok: true; paid: number; change: number; extraPieces: Denomination[] }
  | { ok: false; paid: number; short: number }

/** Validate a cash payment for a bill. `extraPieces` lists pieces that could have been left out. */
export function checkPayment(tray: Purse, total: number): PaymentCheck {
  const paid = purseTotal(tray)
  if (paid < total) return { ok: false, paid, short: total - paid }
  const extraPieces = DENOMINATIONS.filter((d) => (tray[d] ?? 0) > 0 && paid - d >= total)
  return { ok: true, paid, change: paid - total, extraPieces }
}

export const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** A starting wallet for a given amount, split into friendly pieces for practice. */
export function walletFor(amount: number): Purse {
  const plan: Array<[Denomination, number]> = [
    [500, 0.4], [200, 0.2], [100, 0.15], [50, 0.1], [20, 0.06], [10, 0.04], [5, 0.025], [2, 0.01], [1, 0.005],
  ]
  let left = amount
  const out: Purse = {}
  for (const [d, share] of plan) {
    const n = Math.min(Math.floor((amount * share) / d), Math.floor(left / d))
    if (n > 0) {
      out[d] = n
      left -= n * d
    }
  }
  return mergePurse(out, breakdown(left))
}
