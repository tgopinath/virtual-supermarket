// Indian currency used throughout the app. Values are whole rupees.

export type Denomination = 1 | 2 | 5 | 10 | 20 | 50 | 100 | 200 | 500

export interface CurrencyInfo {
  value: Denomination
  kind: 'coin' | 'note'
  label: string
  /** Main colour of the educational representation (close to the real note/coin). */
  color: string
  accent: string
  fact: string
}

export const DENOMINATIONS: Denomination[] = [1, 2, 5, 10, 20, 50, 100, 200, 500]

export const CURRENCY: Record<Denomination, CurrencyInfo> = {
  1: { value: 1, kind: 'coin', label: '₹1', color: '#cfd8dc', accent: '#90a4ae', fact: 'The ₹1 coin is small and silver coloured.' },
  2: { value: 2, kind: 'coin', label: '₹2', color: '#b0bec5', accent: '#78909c', fact: 'The ₹2 coin is a little bigger than ₹1.' },
  5: { value: 5, kind: 'coin', label: '₹5', color: '#e0c068', accent: '#b8932f', fact: 'The ₹5 coin is golden and thick.' },
  10: { value: 10, kind: 'coin', label: '₹10', color: '#e6c35c', accent: '#9e9e9e', fact: 'The ₹10 coin has a silver ring and a golden centre.' },
  20: { value: 20, kind: 'note', label: '₹20', color: '#c5d86d', accent: '#7c8f2a', fact: 'The ₹20 note is greenish-yellow.' },
  50: { value: 50, kind: 'note', label: '₹50', color: '#6fd3e0', accent: '#1b8a99', fact: 'The ₹50 note is fluorescent blue.' },
  100: { value: 100, kind: 'note', label: '₹100', color: '#b9a3e3', accent: '#6a4fb3', fact: 'The ₹100 note is lavender coloured.' },
  200: { value: 200, kind: 'note', label: '₹200', color: '#f5b041', accent: '#b9770e', fact: 'The ₹200 note is bright yellow-orange.' },
  500: { value: 500, kind: 'note', label: '₹500', color: '#b8b4a8', accent: '#6d6a5f', fact: 'The ₹500 note is stone grey.' },
}

/** A bag of money: how many of each denomination. */
export type Purse = Partial<Record<Denomination, number>>
