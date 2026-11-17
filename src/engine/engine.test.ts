import { describe, expect, it } from 'vitest'
import { PRODUCTS, getProduct } from '../data/products'
import { addItem, cartCount, cartTotal, compareProducts, removeItem, setQty } from './cart'
import { createChallenge, evaluate, healthyReport, mulberry32 } from './challenges'
import { billMatchesCart, billTotal, chooseMethod, confirmChange, payCard, payCash, scan, startCheckout } from './checkout'
import { nextUnlocked } from './levels'
import { breakdown, checkPayment, makeExact, purseTotal, subtractPurse, walletFor } from './money'
import { buildQuiz, isCorrect } from './questions'
import { ACHIEVEMENTS, buyItem, initialProgress, newAchievements } from './rewards'

describe('product database', () => {
  it('has unique ids and barcodes and whole-rupee prices', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length)
    expect(new Set(PRODUCTS.map((p) => p.barcode)).size).toBe(PRODUCTS.length)
    PRODUCTS.forEach((p) => expect(Number.isInteger(p.price) && p.price > 0).toBe(true))
  })
})

describe('cart', () => {
  it('adds, merges, changes quantity and removes', () => {
    let c = addItem([], 'apple')
    c = addItem(c, 'apple', 2)
    c = addItem(c, 'milk')
    expect(cartCount(c)).toBe(4)
    expect(cartTotal(c)).toBe(3 * 20 + 30)
    c = setQty(c, 'apple', 1)
    expect(cartTotal(c)).toBe(50)
    c = setQty(c, 'milk', 0)
    expect(c).toEqual([{ productId: 'apple', qty: 1 }])
    expect(removeItem(c, 'apple')).toEqual([])
  })
  it('rejects unknown products', () => {
    expect(() => addItem([], 'unicorn')).toThrow()
  })
  it('compares price per unit', () => {
    const cmp = compareProducts(getProduct('butter'), getProduct('cheese'))
    expect(cmp.cheaper?.id).toBe('butter')
    expect(cmp.perUnit?.a).toBe(55)
    expect(cmp.perUnit?.b).toBe(60)
    expect(cmp.perUnit?.betterValue?.id).toBe('butter')
  })
})

describe('money', () => {
  it('breaks amounts into fewest pieces', () => {
    expect(breakdown(135)).toEqual({ 100: 1, 20: 1, 10: 1, 5: 1 })
    expect(purseTotal(breakdown(1888))).toBe(1888)
  })
  it('validates payment and change', () => {
    expect(checkPayment({ 100: 1, 20: 1, 10: 1, 5: 1 }, 135)).toMatchObject({ ok: true, change: 0 })
    expect(checkPayment({ 50: 2, 20: 1, 10: 1, 5: 1 }, 135)).toMatchObject({ ok: true, change: 0 })
    expect(checkPayment({ 100: 1, 50: 1 }, 135)).toMatchObject({ ok: true, paid: 150, change: 15 })
    expect(checkPayment({ 100: 1 }, 135)).toMatchObject({ ok: false, short: 35 })
    const extra = checkPayment({ 500: 1, 100: 1 }, 135)
    expect(extra.ok && extra.extraPieces).toEqual([100])
  })
  it('makes exact amounts from a limited purse', () => {
    expect(purseTotal(makeExact(70, { 50: 1, 20: 2 })!)).toBe(70)
    expect(makeExact(30, { 50: 1 })).toBeNull()
  })
  it('builds wallets that add up', () => {
    for (const amount of [100, 350, 500, 2000, 777]) expect(purseTotal(walletFor(amount))).toBe(amount)
  })
  it('refuses to spend money the purse does not have', () => {
    expect(() => subtractPurse({ 10: 1 }, { 20: 1 })).toThrow()
  })
})

describe('checkout', () => {
  const cart = [{ productId: 'apple', qty: 2 }, { productId: 'milk', qty: 1 }, { productId: 'bread', qty: 1 }]
  it('scans every line, then pays cash with change', () => {
    let s = startCheckout(cart)
    const r1 = scan(s, 'apple'); if (!r1.ok) throw 0; s = r1.state
    expect(r1.message).toBe('Apple × 2 = ₹40')
    expect(scan(s, 'apple').ok).toBe(false)
    for (const id of ['milk', 'bread']) { const r = scan(s, id); if (!r.ok) throw 0; s = r.state }
    expect(s.phase).toBe('method')
    expect(billTotal(s.bill)).toBe(95)
    expect(billMatchesCart(s.bill, cart)).toBe(true)
    const m = chooseMethod(s, 'cash'); if (!m.ok) throw 0; s = m.state
    s = { ...s, tray: { 50: 1 } }
    expect(payCash(s, { 50: 1 }).ok).toBe(false)
    s = { ...s, tray: { 100: 1 } }
    expect(payCash(s, { 50: 1 }).ok).toBe(false) // not in wallet
    const paid = payCash(s, { 100: 1, 50: 1 }); if (!paid.ok) throw 0; s = paid.state
    expect(s.phase).toBe('change')
    expect(s.changeDue).toBe(5)
    expect(confirmChange({ ...s, changeTray: { 2: 2 } }).ok).toBe(false)
    const done = confirmChange({ ...s, changeTray: { 2: 2, 1: 1 } }); if (!done.ok) throw 0
    expect(done.state.receipt).toMatchObject({ total: 95, paid: 100, change: 5 })
  })
  it('card payment needs the exact total and enough balance', () => {
    let s = startCheckout([{ productId: 'milk', qty: 1 }])
    const r = scan(s, 'milk'); if (!r.ok) throw 0; s = r.state
    const m = chooseMethod(s, 'card'); if (!m.ok) throw 0; s = m.state
    expect(payCard(s, 20, 1000).ok).toBe(false)
    expect(payCard(s, 30, 10).ok).toBe(false)
    expect(payCard(s, 30, 1000).ok).toBe(true)
  })
})

describe('challenges', () => {
  it('evaluates a shopping list exactly', () => {
    const ch = { mode: 'shopping' as const, title: '', list: [{ productId: 'apple', qty: 2 }, { productId: 'milk', qty: 1 }] }
    expect(evaluate(ch, [{ productId: 'apple', qty: 2 }]).success).toBe(false)
    expect(evaluate(ch, [{ productId: 'apple', qty: 2 }, { productId: 'milk', qty: 1 }]).success).toBe(true)
    expect(evaluate(ch, [{ productId: 'apple', qty: 3 }, { productId: 'milk', qty: 1 }]).success).toBe(false)
  })
  it('flags budget overspend', () => {
    const ch = { mode: 'budget' as const, title: '', list: [{ productId: 'rice', qty: 1 }], budget: 100 }
    expect(evaluate(ch, [{ productId: 'rice', qty: 1 }]).remaining).toBe(40)
    const over = evaluate(ch, [{ productId: 'rice', qty: 1 }, { productId: 'cake', qty: 1 }])
    expect(over.withinBudget).toBe(false)
    expect(over.success).toBe(false)
  })
  it('generated budget challenges are always achievable', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const ch = createChallenge('budget', 'middle', 7, rng)
      expect(cartTotal(ch.list)).toBeLessThanOrEqual(ch.budget!)
    }
  })
  it('checks a healthy basket', () => {
    const rules = { minFruitVeg: 3, minDairyProtein: 1, minGrain: 1, maxSometimes: 1 }
    expect(healthyReport([{ productId: 'apple', qty: 3 }, { productId: 'milk', qty: 1 }, { productId: 'rice', qty: 1 }], rules).ok).toBe(true)
    expect(healthyReport([{ productId: 'chips', qty: 2 }, { productId: 'apple', qty: 3 }, { productId: 'milk', qty: 1 }, { productId: 'rice', qty: 1 }], rules).ok).toBe(false)
  })
  it('timed challenges fail after the time limit', () => {
    const ch = { mode: 'timed' as const, title: '', list: [{ productId: 'apple', qty: 1 }], timeLimit: 60 }
    expect(evaluate(ch, [{ productId: 'apple', qty: 1 }], 59).success).toBe(true)
    expect(evaluate(ch, [{ productId: 'apple', qty: 1 }], 61).success).toBe(false)
  })
})

describe('questions', () => {
  it('every generated question accepts its own answer', () => {
    const rng = mulberry32(42)
    for (const kind of ['identify', 'prices', 'totals', 'math', 'currency', 'change', 'money'] as const) {
      for (const age of ['little', 'middle', 'big'] as const) {
        for (const q of buildQuiz(kind, age, 4, 20, rng)) {
          expect(isCorrect(q, q.answer)).toBe(true)
          if (q.choices) {
            expect(q.choices).toContain(String(q.answer))
            expect(new Set(q.choices).size).toBe(q.choices.length)
          }
        }
      }
    }
  })
  it('math answers are arithmetically right', () => {
    const rng = mulberry32(3)
    for (const q of buildQuiz('math', 'big', 8, 40, rng)) {
      if (q.skill === 'subtraction' || q.skill === 'addition' || q.skill === 'multiplication') {
        const [lhs, rhs] = q.explain.split(' = ')
        const ops = lhs.replace(/−/g, '-').replace(/×/g, '*')
        expect(Function(`return ${ops}`)()).toBe(Number(rhs))
      }
    }
  })
})

describe('levels and rewards', () => {
  it('unlocks the next level only on a pass at the frontier', () => {
    expect(nextUnlocked(1, 1, true)).toBe(2)
    expect(nextUnlocked(3, 1, true)).toBe(3)
    expect(nextUnlocked(3, 3, false)).toBe(3)
    expect(nextUnlocked(8, 8, true)).toBe(9)
  })
  it('awards achievements once', () => {
    const p = initialProgress()
    p.stats.purchases = 1
    expect(newAchievements(p).map((a) => a.id)).toEqual(['first-trip'])
    p.achievements = ['first-trip']
    expect(newAchievements(p)).toEqual([])
    expect(ACHIEVEMENTS).toHaveLength(8)
  })
  it('buys shop items with coins', () => {
    const p = { ...initialProgress(), coins: 60 }
    expect(buyItem(p, 'trolley-sunny').ok).toBe(false)
    const r = buyItem(p, 'trolley-ocean')
    expect(r.ok && r.progress.coins).toBe(10)
    expect(r.ok && buyItem(r.progress, 'trolley-ocean').ok).toBe(false)
  })
})
