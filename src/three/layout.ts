import { DEPARTMENTS, productsIn, type DepartmentId, type Product } from '../data/products'
import type { CameraTarget } from '../store/sessionStore'

// World layout in metres. The store spans x ∈ [-15, 15], z ∈ [-12, 12]; the entrance is at +z.

export interface ShelfLayout {
  id: DepartmentId
  x: number
  z: number
  width: number
  kind: 'produce' | 'fridge' | 'shelf'
}

export const STORE = { halfW: 15, halfD: 12, height: 5 }
export const SHELF_LEVELS = [0.42, 1.0, 1.58]
/** Shelf products are shown larger than life so small hands can find and tap them. */
export const DISPLAY_SCALE = 1.7

export const SHELVES: ShelfLayout[] = [
  { id: 'fruits-veg', x: -9, z: -10, width: 7, kind: 'produce' },
  { id: 'dairy', x: 0, z: -10, width: 6, kind: 'fridge' },
  { id: 'bakery', x: 9, z: -10, width: 6, kind: 'shelf' },
  { id: 'beverages', x: -10.5, z: -3, width: 5.5, kind: 'fridge' },
  { id: 'snacks', x: -3.5, z: -3, width: 5.5, kind: 'shelf' },
  { id: 'household', x: 3.5, z: -3, width: 5.5, kind: 'shelf' },
  { id: 'grocery', x: 10.5, z: -3, width: 5.5, kind: 'shelf' },
]

export const CHECKOUT = { x: -8, z: 6 }
export const TROLLEY_BAY = { x: 1.5, z: 6.9 }
export const DOOR = { x: 0, z: 12, width: 4 }

export type Vec3 = [number, number, number]

export function viewFor(target: CameraTarget): { pos: Vec3; look: Vec3 } {
  switch (target) {
    case 'outside': return { pos: [0, 1.7, 20], look: [0, 1.6, 11] }
    case 'entrance': return { pos: [0, 1.7, 10.2], look: [0, 1.1, 2] }
    case 'overview': return { pos: [0, 13, 15], look: [0, 0, -2] }
    // framed left of centre so the 2D checkout panel on the right does not hide the belt
    case 'checkout': return { pos: [CHECKOUT.x + 1.1, 1.85, CHECKOUT.z + 3.6], look: [CHECKOUT.x + 1.5, 0.85, CHECKOUT.z - 0.2] }
    default: {
      const s = SHELVES.find((x) => x.id === target)!
      return { pos: [s.x, 1.5, s.z + Math.max(3.6, s.width * 0.64)], look: [s.x, 0.95, s.z] }
    }
  }
}

/** Where the trolley parks for a camera view: just ahead of the shopper, to the right. */
export function trolleySpot(target: CameraTarget): Vec3 {
  if (target === 'outside') return [TROLLEY_BAY.x, 0, TROLLEY_BAY.z]
  if (target === 'checkout') return [CHECKOUT.x + 2.6, 0, CHECKOUT.z + 1.6]
  if (target === 'entrance' || target === 'overview') return [0.9, 0, 7.6]
  const v = viewFor(target)
  return [v.pos[0] + 1.7, 0, v.pos[2] - 2.4]
}

export function buddySpot(target: CameraTarget): Vec3 {
  if (target === 'outside') return [-2.4, 0, 13.4]
  if (target === 'checkout') return [CHECKOUT.x - 2.4, 0, CHECKOUT.z + 1.4]
  if (target === 'entrance' || target === 'overview') return [-2.4, 0, 6.2]
  const v = viewFor(target)
  return [v.pos[0] - 2.1, 0, v.pos[2] - 2.6]
}

export interface Slot {
  product: Product
  /** Local position on the shelf (x along width, y height). */
  x: number
  y: number
  slotWidth: number
}

export function shelfSlots(shelf: ShelfLayout): Slot[] {
  const products = productsIn(shelf.id)
  const rows = Math.min(SHELF_LEVELS.length, products.length)
  // Spread products evenly over the rows (e.g. 4 products → 2 / 1 / 1) so no shelf level is left empty.
  const rowOf = (i: number) => Math.floor((i * rows) / products.length)
  const usable = shelf.width - 0.4
  return products.map((product, i) => {
    const row = rowOf(i)
    const inRow = products.filter((_, j) => rowOf(j) === row).length
    const col = products.slice(0, i).filter((_, j) => rowOf(j) === row).length
    const slotWidth = usable / inRow
    return { product, x: -usable / 2 + slotWidth * (col + 0.5), y: SHELF_LEVELS[SHELF_LEVELS.length - 1 - row], slotWidth }
  })
}

/** World position of a product slot (used by the VR helper and “help me find it”). */
export function productWorldPos(productId: string): Vec3 | null {
  for (const shelf of SHELVES) {
    const slot = shelfSlots(shelf).find((s) => s.product.id === productId)
    if (slot) return [shelf.x + slot.x, slot.y, shelf.z + 0.25]
  }
  return null
}

export const departmentName = (id: DepartmentId) => DEPARTMENTS.find((d) => d.id === id)!.name
