import { CURRENCY, DENOMINATIONS, type Denomination } from '../data/currency'
import { DEPARTMENTS, PRODUCTS, departmentOf, type Product } from '../data/products'
import { difficulty, pick, randInt, sample, shuffle, type AgeGroup, type Rng } from './challenges'

export type Skill =
  | 'identify' | 'department' | 'price' | 'addition' | 'multiplication' | 'subtraction' | 'comparison'
  | 'currency' | 'make-amount' | 'change' | 'equivalent'

export type QuizKind = 'identify' | 'prices' | 'totals' | 'math' | 'currency' | 'change' | 'money'

export interface Question {
  id: string
  skill: Skill
  prompt: string
  /** Big visual shown with the prompt: emojis, or a denomination to draw. */
  visual?: { images?: string[]; denomination?: Denomination }
  /** 'choice' shows buttons; 'number' a keypad; 'make-amount' the currency tray. */
  input: 'choice' | 'number' | 'make-amount'
  choices?: string[]
  /** For choice → the correct choice string; number/make-amount → the target number. */
  answer: string | number
  hint: string
  explain: string
  /** Optional product id the question taught (counts toward “products identified”). */
  productId?: string
}

let qid = 0
const id = () => `q${++qid}`
const rs = (n: number) => `₹${n}`

function numericChoices(rng: Rng, answer: number, spread: number): string[] {
  const set = new Set<number>([answer])
  while (set.size < 4) {
    const delta = randInt(rng, 1, Math.max(2, spread)) * (rng() < 0.5 ? -1 : 1)
    const v = answer + delta
    if (v > 0) set.add(v)
  }
  return shuffle(rng, [...set]).map(rs)
}

const cheapByLevel = (d: number) => PRODUCTS.filter((p) => p.price <= [30, 50, 80, 120, 160, 200][Math.min(d, 5)])

export function identifyQ(rng: Rng): Question {
  if (rng() < 0.7) {
    const p = pick(rng, PRODUCTS)
    const others = sample(rng, PRODUCTS.filter((x) => x.id !== p.id && x.department === p.department), 3)
    const fill = sample(rng, PRODUCTS.filter((x) => x.id !== p.id && !others.includes(x)), 3 - others.length)
    return {
      id: id(), skill: 'identify', prompt: 'What is this product called?', visual: { images: [p.image] },
      input: 'choice', choices: shuffle(rng, [p, ...others, ...fill].map((x) => x.name)), answer: p.name,
      hint: `It is found in ${departmentOf(p.department).name}.`, explain: `This is ${p.name}. ${p.info}`, productId: p.id,
    }
  }
  const p = pick(rng, PRODUCTS)
  const depts = shuffle(rng, [departmentOf(p.department), ...sample(rng, DEPARTMENTS.filter((d) => d.id !== p.department), 3)])
  return {
    id: id(), skill: 'department', prompt: `Which aisle sells ${p.name}?`, visual: { images: [p.image] },
    input: 'choice', choices: depts.map((d) => d.name), answer: departmentOf(p.department).name,
    hint: 'Think about what kind of thing it is.', explain: `${p.name} is in the ${departmentOf(p.department).name} aisle.`, productId: p.id,
  }
}

export function priceQ(rng: Rng, d: number): Question {
  const pool = cheapByLevel(d + 1)
  const p = pick(rng, pool)
  if (rng() < 0.5) {
    return {
      id: id(), skill: 'price', prompt: `The price tag says ${rs(p.price)} for ${p.unit}. How much is one ${p.name}?`,
      visual: { images: [p.image] }, input: 'choice', choices: numericChoices(rng, p.price, 10), answer: rs(p.price),
      hint: 'Read the number after the ₹ sign.', explain: `${p.name} costs ${rs(p.price)} for ${p.unit}.`, productId: p.id,
    }
  }
  const options = sample(rng, pool.filter((x) => x.price !== p.price), 3)
  const items = shuffle(rng, [p, ...options])
  const cheapest = items.reduce((a, b) => (b.price < a.price ? b : a))
  return {
    id: id(), skill: 'price', prompt: `Which one is the cheapest? ${items.map((x) => `${x.name} ${rs(x.price)}`).join(' · ')}`,
    visual: { images: items.map((x) => x.image) }, input: 'choice', choices: items.map((x) => x.name), answer: cheapest.name,
    hint: 'The cheapest has the smallest number.', explain: `${cheapest.name} at ${rs(cheapest.price)} costs the least.`, productId: cheapest.id,
  }
}

export function additionQ(rng: Rng, d: number): Question {
  const n = d >= 3 ? 3 : 2
  const items = sample(rng, cheapByLevel(d), n)
  const total = items.reduce((s, x) => s + x.price, 0)
  return {
    id: id(), skill: 'addition',
    prompt: `${items.map((x) => `${x.name} costs ${rs(x.price)}`).join(', ')}. What is the total?`,
    visual: { images: items.map((x) => x.image) },
    input: d >= 2 ? 'number' : 'choice', choices: d >= 2 ? undefined : numericChoices(rng, total, 10), answer: d >= 2 ? total : rs(total),
    hint: 'Add the prices one by one.', explain: `${items.map((x) => x.price).join(' + ')} = ${total}`,
  }
}

export function multiplicationQ(rng: Rng, d: number): Question {
  const p = pick(rng, cheapByLevel(Math.max(0, d - 1)).filter((x) => x.price <= 60))
  const n = randInt(rng, 2, Math.min(3 + d, 6))
  const total = p.price * n
  return {
    id: id(), skill: 'multiplication', prompt: `What is the cost of ${n} ${p.name} at ${rs(p.price)} each?`,
    visual: { images: Array(n).fill(p.image) }, input: d >= 2 ? 'number' : 'choice',
    choices: d >= 2 ? undefined : numericChoices(rng, total, p.price), answer: d >= 2 ? total : rs(total),
    hint: `Add ${rs(p.price)} ${n} times, or multiply ${p.price} × ${n}.`, explain: `${p.price} × ${n} = ${total}`, productId: p.id,
  }
}

export function subtractionQ(rng: Rng, d: number): Question {
  const have = pick(rng, [50, 100, 100, 200, 500].slice(0, 2 + Math.min(d, 3)))
  const spent = randInt(rng, Math.ceil(have * 0.2), have - 1)
  const left = have - spent
  return {
    id: id(), skill: 'subtraction', prompt: `You have ${rs(have)} and spend ${rs(spent)}. How much money remains?`,
    visual: { denomination: have as Denomination }, input: d >= 1 ? 'number' : 'choice',
    choices: d >= 1 ? undefined : numericChoices(rng, left, 10), answer: d >= 1 ? left : rs(left),
    hint: `Count up from ${spent} to ${have}.`, explain: `${have} − ${spent} = ${left}`,
  }
}

export function comparisonQ(rng: Rng): Question {
  const [smallG, bigG] = pick(rng, [[500, 1000], [250, 1000], [500, 2000]] as const)
  const name = pick(rng, ['rice', 'sugar', 'wheat flour', 'dal'])
  const bigPrice = pick(rng, [60, 80, 100, 120])
  const ratio = bigG / smallG
  // Make the small pack sometimes better value, sometimes worse.
  const smallPrice = Math.round(bigPrice / ratio) + pick(rng, [-5, 5, 10])
  const smallPer = (smallPrice * ratio)
  const bigBetter = bigPrice < smallPer
  const label = (g: number) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`)
  const a = `${label(smallG)} for ${rs(smallPrice)}`
  const b = `${label(bigG)} for ${rs(bigPrice)}`
  return {
    id: id(), skill: 'comparison', prompt: `Which is better value: ${name} ${a} or ${name} ${b}?`,
    visual: { images: ['🛍️', '🛍️'] }, input: 'choice', choices: [a, b], answer: bigBetter ? b : a,
    hint: `${ratio} small packs make one big pack. What would ${ratio} small packs cost?`,
    explain: `${ratio} × ${rs(smallPrice)} = ${rs(smallPer)} for ${label(bigG)}, versus ${rs(bigPrice)}. ${bigBetter ? 'The big pack' : 'The small pack'} is better value.`,
  }
}

export function currencyQ(rng: Rng, d: number): Question {
  const pool = DENOMINATIONS.slice(0, 5 + Math.min(d, 4))
  const den = pick(rng, pool)
  if (rng() < 0.5) {
    const choices = shuffle(rng, [den, ...sample(rng, DENOMINATIONS.filter((x) => x !== den), 3)]).map(rs)
    return {
      id: id(), skill: 'currency', prompt: `Is this a coin or a note — and what is it worth?`, visual: { denomination: den },
      input: 'choice', choices, answer: rs(den), hint: CURRENCY[den].fact, explain: `This is the ${rs(den)} ${CURRENCY[den].kind}. ${CURRENCY[den].fact}`,
    }
  }
  const target = d === 0 ? randInt(rng, 3, 20) : d === 1 ? randInt(rng, 15, 99) : randInt(rng, 60, 480)
  return {
    id: id(), skill: 'make-amount', prompt: `Make exactly ${rs(target)} using coins and notes.`, input: 'make-amount', answer: target,
    hint: 'Start with the biggest note that is not more than the amount.', explain: `One way: ${describePieces(target)}.`,
  }
}

export function changeQ(rng: Rng, d: number): Question {
  const price = d === 0 ? randInt(rng, 3, 9) : d === 1 ? randInt(rng, 11, 95) : randInt(rng, 101, 480)
  const paid = [10, 20, 50, 100, 200, 500].find((v) => v > price && (d === 0 || v >= price + 1))!
  const change = paid - price
  const asAmount = rng() < 0.5
  return {
    id: id(), skill: 'change', prompt: `Your bill is ${rs(price)}. You pay with ${rs(paid)}. ${asAmount ? 'Give the correct change using coins and notes.' : 'How much change should you get back?'}`,
    visual: { denomination: paid as Denomination }, input: asAmount ? 'make-amount' : d >= 1 ? 'number' : 'choice',
    choices: !asAmount && d === 0 ? numericChoices(rng, change, 5) : undefined, answer: !asAmount && d === 0 ? rs(change) : change,
    hint: `Count up from ${price} to ${paid}.`, explain: `${paid} − ${price} = ${change}`,
  }
}

export function equivalentQ(rng: Rng): Question {
  const pairs: Array<[Denomination, Denomination]> = [[10, 5], [10, 2], [20, 10], [50, 10], [100, 20], [100, 50], [200, 100], [500, 100], [50, 5], [20, 2]]
  const [big, small] = pick(rng, pairs)
  const n = big / small
  return {
    id: id(), skill: 'equivalent', prompt: `How many ${rs(small)} make one ${rs(big)}?`, visual: { denomination: big },
    input: 'choice', choices: numericChoices(rng, n, 3).map((s) => s.replace('₹', '')), answer: String(n),
    hint: `Count in ${small}s until you reach ${big}.`, explain: `${n} × ${rs(small)} = ${rs(big)}`,
  }
}

export const describePieces = (amount: number) => {
  const parts: string[] = []
  let left = amount
  for (const d of [...DENOMINATIONS].reverse()) {
    while (left >= d) { parts.push(rs(d)); left -= d }
  }
  return parts.join(' + ')
}

/** Build a quiz of `count` questions for an activity. */
export function buildQuiz(kind: QuizKind, age: AgeGroup, level: number, count = 5, rng: Rng = Math.random): Question[] {
  const d = difficulty(age, level)
  const gen: Record<QuizKind, Array<() => Question>> = {
    identify: [() => identifyQ(rng)],
    prices: [() => priceQ(rng, d)],
    totals: [() => additionQ(rng, d), () => multiplicationQ(rng, d)],
    math: [() => additionQ(rng, d), () => multiplicationQ(rng, d), () => subtractionQ(rng, d), () => comparisonQ(rng)],
    currency: [() => currencyQ(rng, d), () => equivalentQ(rng)],
    change: [() => changeQ(rng, d), () => subtractionQ(rng, d)],
    money: [() => currencyQ(rng, d), () => equivalentQ(rng), () => changeQ(rng, d)],
  }
  const gens = gen[kind]
  return Array.from({ length: count }, (_, i) => gens[i % gens.length]())
}

/** Check an answer. `value` is the chosen string, typed number, or the made amount. */
export function isCorrect(q: Question, value: string | number): boolean {
  if (q.input === 'choice') return String(value) === String(q.answer)
  return Number(value) === Number(q.answer)
}

export type { Product }
