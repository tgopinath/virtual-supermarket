import { create } from 'zustand'
import { haptic, sfx } from '../audio/audio'
import { speak } from '../audio/voice'
import type { Denomination, Purse } from '../data/currency'
import { getProduct, type DepartmentId } from '../data/products'
import { addItem, cartCount, cartTotal, removeItem, setQty, type CartLine } from '../engine/cart'
import { createChallenge, evaluate, starsFor, type Challenge, type Evaluation, type ShoppingMode } from '../engine/challenges'
import * as co from '../engine/checkout'
import { levelDef } from '../engine/levels'
import { addToPurse, mergePurse, purseTotal, removeFromPurse, subtractPurse, walletFor } from '../engine/money'
import { buildQuiz, isCorrect, type Question, type QuizKind } from '../engine/questions'
import type { Achievement } from '../engine/rewards'
import { xrStore } from '../xr/xrStore'
import { useProgress, type Award } from './progressStore'

export type Screen =
  | 'welcome' | 'avatar' | 'age' | 'modes' | 'levels' | 'store' | 'quiz' | 'complete'
  | 'rewards' | 'progress' | 'parent' | 'ar' | 'settings'

export type StorePhase = 'outside' | 'shopping' | 'checkout'
export type CameraTarget = DepartmentId | 'entrance' | 'checkout' | 'outside' | 'overview'
export type BuddyMood = 'happy' | 'thinking' | 'celebrate' | 'oops'

export interface LastResult {
  kind: 'shop' | 'quiz'
  title: string
  success: boolean
  stars: number
  lines: string[]
  award: Award
  evaluation?: Evaluation
  receipt?: co.Receipt | null
  nextLevel?: number
}

interface QuizState {
  kind: QuizKind
  level?: number
  questions: Question[]
  index: number
  answers: Array<boolean | null>
  tries: number
  feedback: { correct: boolean; text: string } | null
  makeTray: Purse
}

interface Session {
  screen: Screen
  goto: (s: Screen) => void

  // buddy & toasts
  buddy: { text: string; mood: BuddyMood; at: number } | null
  say: (text: string, mood?: BuddyMood) => void
  toasts: Array<{ id: number; achievement: Achievement }>
  pushAchievements: (a: Achievement[]) => void
  dismissToast: (id: number) => void

  // shopping session
  challenge: Challenge | null
  level: number | undefined
  phase: StorePhase
  doorsOpen: boolean
  hasTrolley: boolean
  cart: CartLine[]
  wallet: Purse
  cardBalance: number
  startedAt: number | null
  camera: { target: CameraTarget; seq: number }
  selected: string | null
  compareId: string | null
  dragging: string | null
  cartOpen: boolean
  lastAdded: { id: string; at: number } | null
  startShop: (mode: ShoppingMode, level?: number) => void
  enterStore: () => void
  takeTrolley: () => void
  flyTo: (t: CameraTarget) => void
  select: (id: string | null) => void
  setCompare: (id: string | null) => void
  setDragging: (id: string | null) => void
  setCartOpen: (open: boolean) => void
  addToCart: (id: string, qty?: number) => void
  setLineQty: (id: string, qty: number) => void
  removeLine: (id: string) => void
  elapsedSec: () => number
  timeUp: () => void
  leaveStore: () => void

  // checkout
  checkout: co.CheckoutState | null
  checkoutMsg: { text: string; ok: boolean; at: number } | null
  lastScanned: { id: string; at: number } | null
  goCheckout: () => void
  backToShopping: () => void
  scanItem: (id: string) => void
  chooseMethod: (m: co.PayMethod) => void
  trayAdd: (d: Denomination) => void
  trayRemove: (d: Denomination) => void
  payCash: () => void
  payCard: (amount: number) => void
  changeAdd: (d: Denomination) => void
  changeRemove: (d: Denomination) => void
  confirmChange: () => void
  finishShop: () => void

  // quizzes
  quiz: QuizState | null
  startQuiz: (kind: QuizKind, level?: number) => void
  answerQuiz: (value: string | number) => void
  nextQuestion: () => void
  quizTrayAdd: (d: Denomination) => void
  quizTrayRemove: (d: Denomination) => void

  lastResult: LastResult | null
}

const POCKET_MONEY = 2000
let toastSeq = 0

export const useSession = create<Session>()((set, get) => {
  const flash = (text: string, ok: boolean) => {
    set({ checkoutMsg: { text, ok, at: Date.now() } })
    if (!ok) sfx.wrong()
  }
  const vrSession = () => xrStore.getState().session

  return {
    screen: 'welcome',
    goto: (screen) => set({ screen }),

    buddy: null,
    say: (text, mood = 'happy') => {
      set({ buddy: { text, mood, at: Date.now() } })
      speak(text)
    },
    toasts: [],
    pushAchievements: (list) => {
      if (!list.length) return
      sfx.celebrate()
      set((s) => ({ toasts: [...s.toasts, ...list.map((achievement) => ({ id: ++toastSeq, achievement }))] }))
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    challenge: null,
    level: undefined,
    phase: 'outside',
    doorsOpen: false,
    hasTrolley: false,
    cart: [],
    wallet: {},
    cardBalance: POCKET_MONEY,
    startedAt: null,
    camera: { target: 'outside', seq: 0 },
    selected: null,
    compareId: null,
    dragging: null,
    cartOpen: false,
    lastAdded: null,

    startShop: (mode, level) => {
      const age = useProgress.getState().profile?.age ?? 'middle'
      const lvl = level ?? useProgress.getState().unlockedLevel
      const challenge = createChallenge(mode, age, Math.min(lvl, 8))
      const budget = challenge.budget
      set({
        screen: 'store', challenge, level, phase: 'outside', doorsOpen: false, hasTrolley: false, cart: [],
        wallet: walletFor(budget ?? POCKET_MONEY), cardBalance: budget ? 0 : POCKET_MONEY, startedAt: null,
        camera: { target: 'outside', seq: get().camera.seq + 1 }, selected: null, compareId: null, checkout: null,
        checkoutMsg: null, cartOpen: false, lastResult: null,
      })
      useProgress.getState().startSession()
      const intro: Record<ShoppingMode, string> = {
        free: 'Welcome to My Supermarket! Tap Enter to go inside and explore.',
        shopping: `Here is your shopping list. Find ${challenge.list.length} items. Tap Enter to start!`,
        budget: `Your budget is ₹${budget}. Buy everything on the list without spending more!`,
        healthy: 'Let us build a healthy basket with fruits, vegetables, dairy and grains!',
        timed: `You have ${challenge.timeLimit} seconds once you go in. Ready, steady, shop!`,
      }
      get().say(intro[mode])
    },

    enterStore: () => {
      if (get().phase !== 'outside') return
      sfx.door()
      set({ doorsOpen: true, phase: 'shopping', startedAt: Date.now(), camera: { target: 'entrance', seq: get().camera.seq + 1 } })
      setTimeout(() => get().say('Grab a trolley first! Tap the red trolley next to the door.'), 900)
    },

    takeTrolley: () => {
      if (get().hasTrolley) return
      sfx.trolley()
      set({ hasTrolley: true })
      get().say('Great! Now pick an aisle at the bottom, then tap or drag products into your trolley.')
    },

    flyTo: (target) => {
      if (get().camera.target !== target) sfx.trolley()
      set((s) => ({ camera: { target, seq: s.camera.seq + 1 }, selected: null }))
    },

    select: (id) => {
      if (id) {
        sfx.pickup()
        const earned = useProgress.getState().identify(id)
        get().pushAchievements(earned)
        const p = getProduct(id)
        get().say(`${p.name}. ₹${p.price} for ${p.unit}.`, 'thinking')
      }
      set({ selected: id })
    },
    setCompare: (id) => set({ compareId: id }),
    setDragging: (id) => set({ dragging: id }),
    setCartOpen: (cartOpen) => set({ cartOpen }),

    addToCart: (id, qty = 1) => {
      const s = get()
      if (s.phase !== 'shopping') return
      if (!s.hasTrolley) set({ hasTrolley: true })
      const cart = addItem(s.cart, id, qty)
      sfx.place()
      haptic(vrSession(), 0.7, 70)
      set({ cart, lastAdded: { id, at: Date.now() } })
      useProgress.getState().identify(id)
      const p = getProduct(id)
      const c = s.challenge
      if (c?.budget && cartTotal(cart) > c.budget) {
        get().say(`Oh no! You are ₹${cartTotal(cart) - c.budget} over your budget. Remove something.`, 'oops')
      } else if (c && c.list.length && !c.list.some((l) => l.productId === id) && c.mode !== 'budget') {
        get().say(`${p.name} is not on your list. You can take it out of the trolley.`, 'thinking')
      } else {
        get().say(`${p.name} added. Your total is ₹${cartTotal(cart)}.`)
      }
    },
    setLineQty: (id, qty) => {
      sfx.click()
      set((s) => ({ cart: setQty(s.cart, id, qty) }))
    },
    removeLine: (id) => {
      sfx.remove()
      set((s) => ({ cart: removeItem(s.cart, id) }))
    },

    elapsedSec: () => {
      const t = get().startedAt
      return t ? (Date.now() - t) / 1000 : 0
    },

    timeUp: () => {
      const s = get()
      if (s.screen !== 'store' || s.checkout?.phase === 'receipt') return
      sfx.wrong()
      const ev = evaluate(s.challenge!, s.cart, s.elapsedSec())
      const award = useProgress.getState().recordShop({
        mode: 'timed', success: false, stars: 0, level: s.level, purchased: false, elapsedSec: s.elapsedSec(), detail: 'Time ran out',
      })
      get().pushAchievements(award.achievements)
      set({
        screen: 'complete', checkout: null,
        lastResult: { kind: 'shop', title: "Time's up!", success: false, stars: 0, lines: ['The timer reached zero before you paid.', ...ev.feedback], award, evaluation: ev },
      })
      get().say("Time's up! Let us try again – you are getting faster!", 'oops')
    },

    leaveStore: () => set({ screen: 'modes', checkout: null, challenge: null, phase: 'outside' }),

    // ---- checkout -------------------------------------------------------------
    checkout: null,
    checkoutMsg: null,
    lastScanned: null,

    goCheckout: () => {
      const s = get()
      if (!s.cart.length) {
        get().say('Your trolley is empty! Pick some products first.', 'oops')
        return
      }
      if (s.challenge?.budget && cartTotal(s.cart) > s.challenge.budget) {
        get().say(`You are over budget by ₹${cartTotal(s.cart) - s.challenge.budget}. Remove something before paying.`, 'oops')
        return
      }
      set({ checkout: co.startCheckout(s.cart), phase: 'checkout', selected: null, cartOpen: false, checkoutMsg: null, camera: { target: 'checkout', seq: s.camera.seq + 1 } })
      get().say('Welcome to the cash counter! Put each item on the scanner.')
    },

    backToShopping: () => {
      if (get().checkout?.phase !== 'scan' || get().checkout?.bill.length) return
      set({ checkout: null, phase: 'shopping', camera: { target: 'entrance', seq: get().camera.seq + 1 } })
    },

    scanItem: (id) => {
      const s = get().checkout
      if (!s) return
      const r = co.scan(s, id)
      if (!r.ok) return flash(r.message, false)
      sfx.beep()
      haptic(vrSession(), 0.4, 40)
      set({ checkout: r.state, lastScanned: { id, at: Date.now() } })
      flash(r.message, true)
      if (r.state.phase === 'method') {
        const total = co.billTotal(r.state.bill)
        setTimeout(() => get().say(`All scanned! Your total is ₹${total}. How would you like to pay?`), 500)
      }
    },

    chooseMethod: (m) => {
      const s = get().checkout
      if (!s) return
      if (m !== 'cash' && get().cardBalance <= 0) return flash('In the budget challenge you pay with your cash.', false)
      const r = co.chooseMethod(s, m)
      if (!r.ok) return flash(r.message, false)
      set({ checkout: r.state, checkoutMsg: null })
      const total = co.billTotal(s.bill)
      get().say(m === 'cash' ? `Drag notes and coins to the tray to make ₹${total} or more.` : `Type ₹${total} on the machine, then tap to pay.`)
    },

    trayAdd: (d) => {
      const s = get()
      if (!s.checkout || s.checkout.phase !== 'cash') return
      const inTray = s.checkout.tray[d] ?? 0
      if ((s.wallet[d] ?? 0) <= inTray) return flash(`You have no more ₹${d} in your wallet.`, false)
      d >= 20 ? sfx.note() : sfx.coin()
      haptic(vrSession(), 0.3, 30)
      set({ checkout: { ...s.checkout, tray: addToPurse(s.checkout.tray, d) } })
    },
    trayRemove: (d) => {
      const s = get().checkout
      if (!s || s.phase !== 'cash' || !s.tray[d]) return
      sfx.click()
      set({ checkout: { ...s, tray: removeFromPurse(s.tray, d) } })
    },

    payCash: () => {
      const s = get()
      if (!s.checkout) return
      const r = co.payCash(s.checkout, s.wallet)
      if (!r.ok) {
        get().say(r.message, 'oops')
        return flash(r.message, false)
      }
      sfx.register()
      set({ checkout: r.state, wallet: subtractPurse(s.wallet, s.checkout.tray) })
      flash(r.message, true)
      get().say(r.message, r.state.phase === 'receipt' ? 'celebrate' : 'thinking')
      if (r.state.phase === 'receipt') sfx.printer()
    },

    payCard: (amount) => {
      const s = get()
      if (!s.checkout) return
      const r = co.payCard(s.checkout, amount, s.cardBalance)
      if (!r.ok) {
        get().say(r.message, 'oops')
        return flash(r.message, false)
      }
      sfx.confirm()
      setTimeout(sfx.printer, 300)
      set({ checkout: r.state, cardBalance: s.cardBalance - amount })
      flash(r.message, true)
      get().say('Payment approved! Here is your receipt.', 'celebrate')
    },

    changeAdd: (d) => {
      const s = get().checkout
      if (!s || s.phase !== 'change') return
      d >= 20 ? sfx.note() : sfx.coin()
      set({ checkout: { ...s, changeTray: addToPurse(s.changeTray, d) } })
    },
    changeRemove: (d) => {
      const s = get().checkout
      if (!s || s.phase !== 'change' || !s.changeTray[d]) return
      sfx.click()
      set({ checkout: { ...s, changeTray: removeFromPurse(s.changeTray, d) } })
    },

    confirmChange: () => {
      const s = get()
      if (!s.checkout) return
      const r = co.confirmChange(s.checkout)
      if (!r.ok) {
        get().say(r.message, 'oops')
        return flash(r.message, false)
      }
      sfx.confirm()
      setTimeout(sfx.printer, 300)
      set({ checkout: r.state, wallet: mergePurse(s.wallet, s.checkout.changeTray) })
      flash(r.message, true)
      get().say('Correct change! Here is your receipt.', 'celebrate')
    },

    finishShop: () => {
      const s = get()
      const receipt = s.checkout?.receipt
      if (!receipt || !s.challenge) return
      const elapsed = s.elapsedSec()
      const ev = evaluate(s.challenge, s.cart, elapsed)
      const stars = starsFor(ev, s.challenge.mode, elapsed, s.challenge.timeLimit)
      const award = useProgress.getState().recordShop({
        mode: s.challenge.mode, success: ev.success || s.challenge.mode === 'free', stars, level: s.level, purchased: true,
        remaining: ev.remaining, elapsedSec: elapsed, detail: `₹${receipt.total} · ${cartCount(s.cart)} items`,
      })
      get().pushAchievements(award.achievements)
      sfx.celebrate()
      const success = ev.success || s.challenge.mode === 'free'
      const lines: string[] = [`You bought ${cartCount(s.cart)} items for ₹${receipt.total}.`]
      if (receipt.change) lines.push(`You got ₹${receipt.change} change back.`)
      if (ev.remaining != null) lines.push(ev.remaining >= 0 ? `You stayed within budget with ₹${ev.remaining} left over.` : '')
      if (s.challenge.mode === 'timed') lines.push(`Time: ${Math.round(elapsed)} of ${s.challenge.timeLimit} seconds.`)
      lines.push(...ev.feedback)
      set({
        screen: 'complete',
        lastResult: {
          kind: 'shop', title: success ? 'Shopping complete!' : 'Almost there!', success, stars, lines: lines.filter(Boolean), award,
          evaluation: ev, receipt, nextLevel: award.levelUp ?? undefined,
        },
      })
      get().say(success ? 'Well done, super shopper!' : 'Good try! Check the tips and try again.', success ? 'celebrate' : 'thinking')
    },

    // ---- quizzes --------------------------------------------------------------
    quiz: null,
    startQuiz: (kind, level) => {
      const age = useProgress.getState().profile?.age ?? 'middle'
      const lvl = level ?? useProgress.getState().unlockedLevel
      const questions = buildQuiz(kind, age, Math.min(lvl, 8), kind === 'math' || kind === 'money' ? 8 : 5)
      useProgress.getState().startSession()
      set({ screen: 'quiz', lastResult: null, quiz: { kind, level, questions, index: 0, answers: questions.map(() => null), tries: 0, feedback: null, makeTray: {} } })
      get().say(questions[0].prompt, 'thinking')
    },

    answerQuiz: (value) => {
      const q = get().quiz
      if (!q || quizDone(q)) return
      const question = q.questions[q.index]
      const answers = [...q.answers]
      if (isCorrect(question, value)) {
        // Only a first-try answer is scored as correct; a retry still moves on.
        if (q.tries === 0) answers[q.index] = true
        sfx.confirm()
        set({ quiz: { ...q, answers, feedback: { correct: true, text: question.explain } } })
        get().say(`Correct! ${question.explain}`, 'celebrate')
        return
      }
      answers[q.index] = false
      sfx.wrong()
      const tries = q.tries + 1
      if (tries === 1) {
        set({ quiz: { ...q, answers, tries, feedback: { correct: false, text: `Hint: ${question.hint}` } } })
        get().say(`Not quite. Hint: ${question.hint}`, 'thinking')
      } else {
        const shown = question.input === 'choice' ? String(question.answer) : `₹${question.answer}`
        set({ quiz: { ...q, answers, tries, feedback: { correct: false, text: `The answer is ${shown}. ${question.explain}` } } })
        get().say(`The answer is ${shown}. ${question.explain}`, 'thinking')
      }
    },

    nextQuestion: () => {
      const q = get().quiz
      if (!q) return
      if (q.index + 1 < q.questions.length) {
        const nq = q.questions[q.index + 1]
        set({ quiz: { ...q, index: q.index + 1, tries: 0, feedback: null, makeTray: {} } })
        get().say(nq.prompt, 'thinking')
        return
      }
      const correct = q.answers.map(Boolean)
      const passShare = q.level ? levelDef(q.level).pass : 0.8
      const award = useProgress.getState().recordQuiz({ questions: q.questions, correct, level: q.level, passShare })
      get().pushAchievements(award.achievements)
      const right = correct.filter(Boolean).length
      const success = right / q.questions.length >= passShare
      success ? sfx.celebrate() : sfx.confirm()
      set({
        screen: 'complete',
        lastResult: {
          kind: 'quiz', title: success ? 'Quiz complete!' : 'Keep practising!', success, stars: award.stars, award,
          lines: [`You got ${right} out of ${q.questions.length} right on the first try.`, success ? '' : `Get ${Math.ceil(passShare * q.questions.length)} right to pass.`].filter(Boolean),
          nextLevel: award.levelUp ?? undefined,
        },
      })
      get().say(success ? `Brilliant! ${right} out of ${q.questions.length}!` : `You got ${right}. Practice makes perfect!`, success ? 'celebrate' : 'thinking')
    },

    quizTrayAdd: (d) => {
      const q = get().quiz
      if (!q) return
      d >= 20 ? sfx.note() : sfx.coin()
      set({ quiz: { ...q, makeTray: addToPurse(q.makeTray, d) } })
    },
    quizTrayRemove: (d) => {
      const q = get().quiz
      if (!q || !q.makeTray[d]) return
      sfx.click()
      set({ quiz: { ...q, makeTray: removeFromPurse(q.makeTray, d) } })
    },

    lastResult: null,
  }
})

export const trayTotal = (p: Purse) => purseTotal(p)

/** A question is finished once answered correctly or after the second wrong try. */
export const quizDone = (q: { feedback: { correct: boolean } | null; tries: number }) => !!q.feedback && (q.feedback.correct || q.tries >= 2)
