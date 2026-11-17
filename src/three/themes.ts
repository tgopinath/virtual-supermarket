export interface Theme {
  sky: string
  wall: string
  floorA: string
  floorB: string
  ceiling: string
  ambient: number
  sun: number
  sunColor: string
  bulbs: string[] | null
  fog: string
}

export const THEMES: Record<string, Theme> = {
  sunny: { sky: '#bfe7ff', wall: '#fff3e0', floorA: '#f5f0e6', floorB: '#e9dfcf', ceiling: '#ffffff', ambient: 0.9, sun: 1.4, sunColor: '#fff6e5', bulbs: null, fog: '#bfe7ff' },
  festival: { sky: '#ffcc80', wall: '#fff8e1', floorA: '#ffe0b2', floorB: '#ffcc80', ceiling: '#fff3e0', ambient: 0.75, sun: 1.1, sunColor: '#ffd180', bulbs: ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb'], fog: '#ffcc80' },
  night: { sky: '#1a237e', wall: '#e8eaf6', floorA: '#c5cae9', floorB: '#9fa8da', ceiling: '#c5cae9', ambient: 0.45, sun: 0.6, sunColor: '#b3c7ff', bulbs: ['#fff59d'], fog: '#1a237e' },
}
