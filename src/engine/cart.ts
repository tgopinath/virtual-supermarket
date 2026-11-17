import { getProduct, type Product } from '../data/products'

export interface CartLine {
  productId: string
  qty: number
}

export const MAX_QTY = 20

export function addItem(cart: CartLine[], productId: string, qty = 1): CartLine[] {
  getProduct(productId)
  const existing = cart.find((l) => l.productId === productId)
  if (existing) return setQty(cart, productId, existing.qty + qty)
  return [...cart, { productId, qty: Math.min(qty, MAX_QTY) }]
}

export function setQty(cart: CartLine[], productId: string, qty: number): CartLine[] {
  if (qty <= 0) return removeItem(cart, productId)
  return cart.map((l) => (l.productId === productId ? { ...l, qty: Math.min(Math.floor(qty), MAX_QTY) } : l))
}

export const removeItem = (cart: CartLine[], productId: string) => cart.filter((l) => l.productId !== productId)

export const lineSubtotal = (line: CartLine) => getProduct(line.productId).price * line.qty

export const cartTotal = (cart: CartLine[]) => cart.reduce((sum, l) => sum + lineSubtotal(l), 0)

export const cartCount = (cart: CartLine[]) => cart.reduce((sum, l) => sum + l.qty, 0)

export const qtyOf = (cart: CartLine[], productId: string) => cart.find((l) => l.productId === productId)?.qty ?? 0

// ---- comparison -------------------------------------------------------------

export interface Comparison {
  cheaper: Product | null
  difference: number
  /** Price per 100 g / 100 ml / 1 piece, when both share a base unit. */
  perUnit: { base: string; a: number; b: number; betterValue: Product | null } | null
}

export function compareProducts(a: Product, b: Product): Comparison {
  const cheaper = a.price === b.price ? null : a.price < b.price ? a : b
  let perUnit: Comparison['perUnit'] = null
  if (a.quantity.base === b.quantity.base) {
    const scale = a.quantity.base === 'piece' ? 1 : 100
    const pa = (a.price / a.quantity.amount) * scale
    const pb = (b.price / b.quantity.amount) * scale
    const round = (n: number) => Math.round(n * 100) / 100
    perUnit = {
      base: a.quantity.base === 'piece' ? '1 piece' : `100 ${a.quantity.base}`,
      a: round(pa),
      b: round(pb),
      betterValue: Math.abs(pa - pb) < 1e-9 ? null : pa < pb ? a : b,
    }
  }
  return { cheaper, difference: Math.abs(a.price - b.price), perUnit }
}
