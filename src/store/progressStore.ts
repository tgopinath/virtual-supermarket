import { del, get, set } from 'idb-keyval'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { setSoundEnabled } from '../audio/audio'
import { setVoiceEnabled } from '../audio/voice'
import type { ShoppingMode } from '../engine/challenges'
import { nextUnlocked } from '../engine/levels'
import type { Question, Skill } from '../engine/questions'
import {
  buyItem, initialProgress, newAchievements, shopItem,
  type Achievement, type Profile, type Progress, type Settings,
} from '../engine/rewards'

// IndexedDB-backed storage so progress survives refreshes; falls back to memory if IDB is blocked.
const memory = new Map<string, string>()
const idbStorage: StateStorage = {
  getItem: async (k) => { try { return (await get<string>(k)) ?? null } catch { return memory.get(k) ?? null } },
  setItem: async (k, v) => { try { await set(k, v) } catch { memory.set(k, v) } },
  removeItem: async (k) => { try { await del(k) } catch { memory.delete(k) } },
}

export interface QuizOutcome {
  questions: Question[]
  correct: boolean[]
  level?: number
  passShare: number
}

export interface ShopOutcome {
  mode: ShoppingMode
  success: boolean
  stars: number
  level?: number
  purchased: boolean
  remaining?: number | null
  elapsedSec: number
  detail: string
}

export interface Award {
  coins: number
  stars: number
  achievements: Achievement[]
  levelUp: number | null
}

interface ProgressActions {
  hydrated: boolean
  setProfile: (p: Profile) => void
  updateSettings: (s: Partial<Settings>) => void
  startSession: () => void
  addTime: (ms: number) => void
  identify: (productId: string) => Achievement[]
  recordQuiz: (o: QuizOutcome) => Award
  recordShop: (o: ShopOutcome) => Award
  buy: (itemId: string) => string | null
  equip: (itemId: string) => void
  resetAll: () => void
}

type State = Progress & ProgressActions

const applySettings = (s: Settings) => { setSoundEnabled(s.sound); setVoiceEnabled(s.voice) }

/** Grant newly earned achievements (and their coin bonus) on a draft progress object. */
function settle(p: Progress): Achievement[] {
  const earned = newAchievements(p)
  for (const a of earned) { p.achievements = [...p.achievements, a.id]; p.coins += a.coins }
  return earned
}

const snapshot = (s: State): Progress => ({
  profile: s.profile, unlockedLevel: s.unlockedLevel, levelStars: s.levelStars, coins: s.coins, stars: s.stars,
  achievements: s.achievements, owned: s.owned, equipped: s.equipped, stats: s.stats, settings: s.settings,
})

const pushHistory = (p: Progress, entry: Progress['stats']['history'][number]) => {
  p.stats = { ...p.stats, history: [entry, ...p.stats.history].slice(0, 40) }
}

export const useProgress = create<State>()(
  persist(
    (setState, getState) => ({
      ...initialProgress(),
      hydrated: false,

      setProfile: (profile) => setState({ profile }),

      updateSettings: (partial) => {
        const settings = { ...getState().settings, ...partial }
        applySettings(settings)
        setState({ settings })
      },

      startSession: () => setState((s) => ({ stats: { ...s.stats, sessions: s.stats.sessions + 1 } })),

      addTime: (ms) => setState((s) => ({ stats: { ...s.stats, timeMs: s.stats.timeMs + ms } })),

      identify: (productId) => {
        const p = snapshot(getState())
        if (p.stats.productsIdentified.includes(productId)) return []
        p.stats = { ...p.stats, productsIdentified: [...p.stats.productsIdentified, productId] }
        const earned = settle(p)
        setState(p)
        return earned
      },

      recordQuiz: ({ questions, correct, level, passShare }) => {
        const p = snapshot(getState())
        const skills = { ...p.stats.skills }
        const identified = new Set(p.stats.productsIdentified)
        questions.forEach((q, i) => {
          const t = skills[q.skill as Skill] ?? { correct: 0, total: 0 }
          skills[q.skill as Skill] = { correct: t.correct + (correct[i] ? 1 : 0), total: t.total + 1 }
          if (correct[i] && q.productId) identified.add(q.productId)
        })
        const right = correct.filter(Boolean).length
        const share = right / questions.length
        const stars = share >= 1 ? 3 : share >= passShare ? 2 : share >= 0.4 ? 1 : 0
        const coins = right * 5 + (share >= passShare ? 15 : 0)
        p.stats = { ...p.stats, skills, productsIdentified: [...identified] }
        p.coins += coins
        p.stars += stars
        let levelUp: number | null = null
        if (level) {
          p.levelStars = { ...p.levelStars, [level]: Math.max(p.levelStars[level] ?? 0, stars) }
          const next = nextUnlocked(p.unlockedLevel, level, share >= passShare)
          if (next > p.unlockedLevel) levelUp = next
          p.unlockedLevel = next
        }
        pushHistory(p, { at: Date.now(), activity: level ? `Level ${level} quiz` : 'Quiz', success: share >= passShare, stars, detail: `${right}/${questions.length} correct` })
        const achievements = settle(p)
        setState(p)
        return { coins, stars, achievements, levelUp }
      },

      recordShop: (o) => {
        const p = snapshot(getState())
        const ch = { ...p.stats.challenges }
        ch[o.mode] = { played: ch[o.mode].played + 1, won: ch[o.mode].won + (o.success ? 1 : 0) }
        const budget = o.mode === 'budget'
          ? { played: p.stats.budget.played + 1, won: p.stats.budget.won + (o.success ? 1 : 0), savedTotal: p.stats.budget.savedTotal + Math.max(0, o.remaining ?? 0) }
          : p.stats.budget
        const bestTimedSec = o.mode === 'timed' && o.success
          ? Math.min(p.stats.bestTimedSec ?? Infinity, Math.round(o.elapsedSec))
          : p.stats.bestTimedSec
        p.stats = { ...p.stats, challenges: ch, budget, bestTimedSec, purchases: p.stats.purchases + (o.purchased ? 1 : 0) }
        const coins = (o.purchased ? 20 : 0) + (o.success && o.mode !== 'free' ? 50 : 0)
        p.coins += coins
        p.stars += o.stars
        let levelUp: number | null = null
        if (o.level) {
          p.levelStars = { ...p.levelStars, [o.level]: Math.max(p.levelStars[o.level] ?? 0, o.stars) }
          const next = nextUnlocked(p.unlockedLevel, o.level, o.success)
          if (next > p.unlockedLevel) levelUp = next
          p.unlockedLevel = next
        }
        pushHistory(p, { at: Date.now(), activity: o.level ? `Level ${o.level} · ${o.mode}` : o.mode, success: o.success, stars: o.stars, detail: o.detail })
        const achievements = settle(p)
        setState(p)
        return { coins, stars: o.stars, achievements, levelUp }
      },

      buy: (itemId) => {
        const r = buyItem(snapshot(getState()), itemId)
        if (!r.ok) return r.reason
        setState({ coins: r.progress.coins, owned: r.progress.owned })
        getState().equip(itemId)
        return null
      },

      equip: (itemId) => {
        const s = getState()
        if (!s.owned.includes(itemId)) return
        const item = shopItem(itemId)
        setState({ equipped: { ...s.equipped, [item.kind]: itemId } })
      },

      resetAll: () => setState({ ...initialProgress() }),
    }),
    {
      name: 'virtual-supermarket-progress',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => snapshot(s),
      onRehydrateStorage: () => (state) => {
        if (state) applySettings(state.settings)
        useProgress.setState({ hydrated: true })
      },
    },
  ),
)
