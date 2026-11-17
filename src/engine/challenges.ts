import { PRODUCTS, getProduct, type Product } from '../data/products'
import { cartTotal, qtyOf, type CartLine } from './cart'

export type AgeGroup = 'little' | 'middle' | 'big'
export const AGE_GROUPS: Record<AgeGroup, { label: string; ages: string; index: number }> = {
  little: { label: 'Little Shopper', ages: '5–7', index: 0 },
  middle: { label: 'Smart Shopper', ages: '8–10', index: 1 },
  big: { label: 'Super Shopper', ages: '11–12', index: 2 },
}

export type ShoppingMode = 'free' | 'shopping' | 'budget' | 'healthy' | 'timed'

export interface Challenge {
  mode: ShoppingMode
  title: string
  list: CartLine[]
  budget?: number
  timeLimit?: number
  /** Present for healthy mode. */
  healthy?: HealthyRules
  level?: number
}

export interface HealthyRules {
  minFruitVeg: number
  minDairyProtein: number
  minGrain: number
  maxSometimes: number
}

// ---- deterministic RNG so tests can pin results -----------------------------

export type Rng = () => number
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
export const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]
export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
export const sample = <T,>(rng: Rng, arr: readonly T[], n: number) => shuffle(rng, arr).slice(0, n)

/** 0 (easiest) … ~5 (hardest), combining age group and level. */
export const difficulty = (age: AgeGroup, level: number) => AGE_GROUPS[age].index + Math.floor((level - 1) / 3)

const food = PRODUCTS.filter((p) => p.health !== 'non-food')

function makeList(rng: Rng, count: number, maxQty: number, pool: Product[] = PRODUCTS): CartLine[] {
  return sample(rng, pool, count).map((p) => ({ productId: p.id, qty: randInt(rng, 1, maxQty) }))
}

export function createChallenge(mode: ShoppingMode, age: AgeGroup, level: number, rng: Rng = Math.random): Challenge {
  const d = difficulty(age, level)
  switch (mode) {
    case 'free':
      return { mode, title: 'Free Shopping', list: [] }
    case 'shopping': {
      const list = makeList(rng, Math.min(2 + d, 6), d === 0 ? 1 : Math.min(1 + d, 4))
      return { mode, title: 'Shopping Challenge', list, level }
    }
    case 'budget': {
      const list = makeList(rng, Math.min(3 + d, 6), Math.min(1 + Math.floor(d / 2), 3), food)
      const need = cartTotal(list)
      // Budget leaves a little room for extras; rounded to a friendly figure.
      const budget = Math.ceil((need * (1.15 + rng() * 0.25)) / 50) * 50
      return { mode, title: 'Budget Challenge', list, budget, level }
    }
    case 'healthy':
      return {
        mode,
        title: 'Healthy Basket',
        list: [],
        healthy: { minFruitVeg: 3 + Math.min(d, 2), minDairyProtein: 1, minGrain: 1, maxSometimes: d >= 2 ? 0 : 1 },
        level,
      }
    case 'timed': {
      const list = makeList(rng, Math.min(3 + d, 6), Math.min(1 + Math.floor(d / 2), 3))
      return { mode, title: 'Timed Shopping', list, timeLimit: 150 - d * 15 + list.length * 10, level }
    }
  }
}

// ---- evaluation --------------------------------------------------------------

export interface ListProgress {
  productId: string
  need: number
  have: number
  done: boolean
  over: boolean
}

export interface HealthyReport {
  fruitVeg: number
  dairyProtein: number
  grain: number
  sometimes: number
  checks: Array<{ label: string; ok: boolean }>
  ok: boolean
}

export interface Evaluation {
  items: ListProgress[]
  listComplete: boolean
  /** Items in the cart that were not on the list (for list-based modes). */
  extras: CartLine[]
  total: number
  remaining: number | null
  withinBudget: boolean
  healthy: HealthyReport | null
  /** 0–1 share of list lines exactly right. */
  accuracy: number
  success: boolean
  feedback: string[]
}

export function healthyReport(cart: CartLine[], rules: HealthyRules): HealthyReport {
  let fruitVeg = 0, dairyProtein = 0, grain = 0, sometimes = 0
  for (const line of cart) {
    const p = getProduct(line.productId)
    if (p.foodGroup === 'fruit' || p.foodGroup === 'vegetable') fruitVeg += line.qty
    if (p.foodGroup === 'dairy' || p.foodGroup === 'protein') dairyProtein += line.qty
    if (p.foodGroup === 'grain') grain += line.qty
    if (p.health === 'sometimes' && p.foodGroup !== 'non-food') sometimes += line.qty
  }
  const checks = [
    { label: `At least ${rules.minFruitVeg} fruits or vegetables`, ok: fruitVeg >= rules.minFruitVeg },
    { label: `At least ${rules.minDairyProtein} dairy or protein food`, ok: dairyProtein >= rules.minDairyProtein },
    { label: `At least ${rules.minGrain} grain food (bread, rice, atta…)`, ok: grain >= rules.minGrain },
    { label: rules.maxSometimes === 0 ? 'No “sometimes” treats' : `At most ${rules.maxSometimes} “sometimes” treat`, ok: sometimes <= rules.maxSometimes },
  ]
  return { fruitVeg, dairyProtein, grain, sometimes, checks, ok: checks.every((c) => c.ok) }
}

export function evaluate(challenge: Challenge, cart: CartLine[], elapsedSec = 0): Evaluation {
  const total = cartTotal(cart)
  const items: ListProgress[] = challenge.list.map((l) => {
    const have = qtyOf(cart, l.productId)
    return { productId: l.productId, need: l.qty, have, done: have >= l.qty, over: have > l.qty }
  })
  const listIds = new Set(challenge.list.map((l) => l.productId))
  const extras = challenge.list.length ? cart.filter((l) => !listIds.has(l.productId)) : []
  const listComplete = items.every((i) => i.done)
  const exact = items.filter((i) => i.have === i.need).length
  const accuracy = items.length ? exact / items.length : 1
  const remaining = challenge.budget != null ? challenge.budget - total : null
  const withinBudget = remaining == null || remaining >= 0
  const healthy = challenge.healthy ? healthyReport(cart, challenge.healthy) : null
  const inTime = challenge.timeLimit == null || elapsedSec <= challenge.timeLimit
  const feedback: string[] = []

  let success = cart.length > 0
  switch (challenge.mode) {
    case 'shopping':
    case 'timed':
      success = listComplete && accuracy === 1 && extras.length === 0 && inTime
      break
    case 'budget':
      success = listComplete && withinBudget
      break
    case 'healthy':
      success = !!healthy?.ok
      break
  }

  for (const i of items) {
    const name = getProduct(i.productId).name
    if (i.have < i.need) feedback.push(`You needed ${i.need} ${name} but have ${i.have}.`)
    else if (i.over) feedback.push(`You took ${i.have - i.need} extra ${name}.`)
  }
  if (extras.length && challenge.mode !== 'budget') feedback.push(`${extras.map((e) => getProduct(e.productId).name).join(', ')} ${extras.length > 1 ? 'were' : 'was'} not on the list.`)
  if (!withinBudget) feedback.push(`You went over the budget by ₹${-remaining!}.`)
  if (!inTime) feedback.push('Time ran out before you finished.')
  healthy?.checks.filter((c) => !c.ok).forEach((c) => feedback.push(`Healthy tip: ${c.label}.`))

  return { items, listComplete, extras, total, remaining, withinBudget, healthy, accuracy, success, feedback }
}

/** 1–3 stars for a finished challenge. */
export function starsFor(ev: Evaluation, mode: ShoppingMode, elapsedSec: number, timeLimit?: number): number {
  if (mode === 'free') return 1
  if (!ev.success) return ev.accuracy >= 0.5 ? 1 : 0
  if (mode === 'budget') return ev.remaining! >= 0 && ev.extras.length === 0 ? 3 : 2
  if (mode === 'timed' && timeLimit) return elapsedSec <= timeLimit * 0.6 ? 3 : 2
  return 3
}
