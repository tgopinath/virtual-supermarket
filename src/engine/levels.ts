import type { ShoppingMode } from './challenges'
import type { QuizKind } from './questions'

export type Activity = { type: 'quiz'; quiz: QuizKind } | { type: 'shop'; mode: ShoppingMode }

export interface LevelDef {
  level: number
  title: string
  goal: string
  activity: Activity
  /** Share of quiz questions that must be right, or challenge success for shop levels. */
  pass: number
}

export const LEVELS: LevelDef[] = [
  { level: 1, title: 'Identify Products', goal: 'Name products and find their aisle.', activity: { type: 'quiz', quiz: 'identify' }, pass: 0.8 },
  { level: 2, title: 'Find Products', goal: 'Walk the aisles and pick the items on your list.', activity: { type: 'shop', mode: 'shopping' }, pass: 1 },
  { level: 3, title: 'Learn Prices', goal: 'Read price tags and spot the cheapest item.', activity: { type: 'quiz', quiz: 'prices' }, pass: 0.8 },
  { level: 4, title: 'Calculate Totals', goal: 'Add up prices and multiply quantities.', activity: { type: 'quiz', quiz: 'totals' }, pass: 0.8 },
  { level: 5, title: 'Understand Currency', goal: 'Know coins and notes and make amounts.', activity: { type: 'quiz', quiz: 'currency' }, pass: 0.8 },
  { level: 6, title: 'Calculate Change', goal: 'Work out the change after paying.', activity: { type: 'quiz', quiz: 'change' }, pass: 0.8 },
  { level: 7, title: 'Shopping Within Budget', goal: 'Buy everything on the list without going over budget.', activity: { type: 'shop', mode: 'budget' }, pass: 1 },
  { level: 8, title: 'Advanced Shopping', goal: 'Beat the clock with a big shopping list.', activity: { type: 'shop', mode: 'timed' }, pass: 1 },
]

export const MAX_LEVEL = LEVELS.length

export const levelDef = (level: number) => LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1]

/** Next unlocked level after a result; never goes down. */
export function nextUnlocked(current: number, playedLevel: number, passed: boolean): number {
  if (!passed || playedLevel < current) return current
  return Math.min(MAX_LEVEL + 1, Math.max(current, playedLevel + 1))
}
