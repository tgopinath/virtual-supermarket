import { productsIn } from '../data/products'
import type { AgeGroup, ShoppingMode } from './challenges'
import { MAX_LEVEL } from './levels'
import type { Skill } from './questions'

export interface Tally { correct: number; total: number }

export interface Stats {
  sessions: number
  timeMs: number
  purchases: number
  productsIdentified: string[]
  challenges: Record<ShoppingMode, { played: number; won: number }>
  skills: Partial<Record<Skill, Tally>>
  budget: { played: number; won: number; savedTotal: number }
  bestTimedSec: number | null
  history: Array<{ at: number; activity: string; success: boolean; stars: number; detail: string }>
}

export interface Settings {
  sound: boolean
  voice: boolean
  subtitles: boolean
  quality: 'low' | 'medium' | 'high'
}

export interface Profile {
  nickname: string
  avatar: string
  age: AgeGroup
}

export interface Progress {
  profile: Profile | null
  unlockedLevel: number
  levelStars: Record<number, number>
  coins: number
  stars: number
  achievements: string[]
  owned: string[]
  equipped: { trolley: string; environment: string; accessory: string }
  stats: Stats
  settings: Settings
}

export const emptyStats = (): Stats => ({
  sessions: 0,
  timeMs: 0,
  purchases: 0,
  productsIdentified: [],
  challenges: { free: { played: 0, won: 0 }, shopping: { played: 0, won: 0 }, budget: { played: 0, won: 0 }, healthy: { played: 0, won: 0 }, timed: { played: 0, won: 0 } },
  skills: {},
  budget: { played: 0, won: 0, savedTotal: 0 },
  bestTimedSec: null,
  history: [],
})

export const initialProgress = (): Progress => ({
  profile: null,
  unlockedLevel: 1,
  levelStars: {},
  coins: 0,
  stars: 0,
  achievements: [],
  owned: ['trolley-classic', 'env-sunny', 'acc-none'],
  equipped: { trolley: 'trolley-classic', environment: 'env-sunny', accessory: 'acc-none' },
  stats: emptyStats(),
  settings: { sound: true, voice: true, subtitles: true, quality: 'medium' },
})

// ---- achievements ------------------------------------------------------------

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  coins: number
  check: (p: Progress) => boolean
}

const accuracy = (t?: Tally) => (t && t.total ? t.correct / t.total : 0)
const fruitVegIds = productsIn('fruits-veg').map((x) => x.id)

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-trip', title: 'First Shopping Trip', description: 'Pay for your first basket.', icon: '🛒', coins: 20, check: (p) => p.stats.purchases >= 1 },
  { id: 'fruit-explorer', title: 'Fruit Explorer', description: 'Discover all 10 fruits and vegetables.', icon: '🍎', coins: 30, check: (p) => fruitVegIds.every((id) => p.stats.productsIdentified.includes(id)) },
  { id: 'smart-shopper', title: 'Smart Shopper', description: 'Complete a shopping list exactly.', icon: '📝', coins: 30, check: (p) => p.stats.challenges.shopping.won >= 1 },
  { id: 'budget-master', title: 'Budget Master', description: 'Win a budget challenge.', icon: '💰', coins: 40, check: (p) => p.stats.budget.won >= 1 },
  {
    id: 'money-expert', title: 'Money Expert', description: 'Answer 10 money questions with 80% accuracy.', icon: '🪙', coins: 40,
    check: (p) => {
      const s = p.stats.skills
      const tallies = [s.currency, s['make-amount'], s.change, s.equivalent].filter(Boolean) as Tally[]
      const t = tallies.reduce((a, b) => ({ correct: a.correct + b.correct, total: a.total + b.total }), { correct: 0, total: 0 })
      return t.total >= 10 && accuracy(t) >= 0.8
    },
  },
  { id: 'quick-checkout', title: 'Quick Checkout', description: 'Win a timed shopping round.', icon: '⏱️', coins: 40, check: (p) => p.stats.challenges.timed.won >= 1 },
  { id: 'healthy-shopper', title: 'Healthy Shopper', description: 'Fill a balanced healthy basket.', icon: '🥦', coins: 40, check: (p) => p.stats.challenges.healthy.won >= 1 },
  { id: 'champion', title: 'Supermarket Champion', description: 'Finish all 8 levels.', icon: '🏆', coins: 100, check: (p) => p.unlockedLevel > MAX_LEVEL },
]

/** Achievements newly earned by `p` that are not yet recorded. */
export const newAchievements = (p: Progress) => ACHIEVEMENTS.filter((a) => !p.achievements.includes(a.id) && a.check(p))

// ---- reward shop -------------------------------------------------------------

export type ShopItemKind = 'trolley' | 'environment' | 'accessory'
export interface ShopItem {
  id: string
  kind: ShopItemKind
  name: string
  cost: number
  icon: string
  /** Trolley colour / environment palette key / accessory model key. */
  value: string
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'trolley-classic', kind: 'trolley', name: 'Classic Red', cost: 0, icon: '🔴', value: '#e53935' },
  { id: 'trolley-ocean', kind: 'trolley', name: 'Ocean Blue', cost: 50, icon: '🔵', value: '#1e88e5' },
  { id: 'trolley-sunny', kind: 'trolley', name: 'Sunny Yellow', cost: 100, icon: '🟡', value: '#fdd835' },
  { id: 'trolley-mint', kind: 'trolley', name: 'Mint Green', cost: 150, icon: '🟢', value: '#26a69a' },
  { id: 'trolley-royal', kind: 'trolley', name: 'Royal Purple', cost: 250, icon: '🟣', value: '#8e24aa' },
  { id: 'env-sunny', kind: 'environment', name: 'Sunny Day', cost: 0, icon: '☀️', value: 'sunny' },
  { id: 'env-festival', kind: 'environment', name: 'Festival Lights', cost: 150, icon: '🪔', value: 'festival' },
  { id: 'env-night', kind: 'environment', name: 'Night Market', cost: 250, icon: '🌙', value: 'night' },
  { id: 'acc-none', kind: 'accessory', name: 'No Hat', cost: 0, icon: '🙂', value: 'none' },
  { id: 'acc-cap', kind: 'accessory', name: 'Cap', cost: 60, icon: '🧢', value: 'cap' },
  { id: 'acc-glasses', kind: 'accessory', name: 'Cool Glasses', cost: 80, icon: '🕶️', value: 'glasses' },
  { id: 'acc-crown', kind: 'accessory', name: 'Crown', cost: 200, icon: '👑', value: 'crown' },
]

export const shopItem = (id: string) => SHOP_ITEMS.find((s) => s.id === id)!

export type PurchaseResult = { ok: true; progress: Progress } | { ok: false; reason: string }

export function buyItem(p: Progress, itemId: string): PurchaseResult {
  const item = SHOP_ITEMS.find((s) => s.id === itemId)
  if (!item) return { ok: false, reason: 'Unknown item' }
  if (p.owned.includes(itemId)) return { ok: false, reason: 'Already owned' }
  if (p.coins < item.cost) return { ok: false, reason: `You need ${item.cost - p.coins} more coins` }
  return { ok: true, progress: { ...p, coins: p.coins - item.cost, owned: [...p.owned, itemId] } }
}

export const skillAccuracy = accuracy
