// AudioManager: every sound is synthesised with the Web Audio API, so no audio files are needed.

let ctx: AudioContext | null = null
let enabled = true

export const setSoundEnabled = (on: boolean) => { enabled = on }

function ac(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {}) {
  const c = ac(); if (!c) return
  const t = c.currentTime + (opts.delay ?? 0)
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(freq, t)
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, opts: { gain?: number; delay?: number; from?: number; to?: number; q?: number } = {}) {
  const c = ac(); if (!c) return
  const t = c.currentTime + (opts.delay ?? 0)
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = opts.q ?? 1.2
  f.frequency.setValueAtTime(opts.from ?? 800, t)
  f.frequency.exponentialRampToValueAtTime(opts.to ?? 300, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.15, t + dur * 0.2)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t)
}

export const sfx = {
  door: () => { noise(0.9, { from: 400, to: 1600, gain: 0.12 }); tone(660, 0.15, { delay: 0.85, gain: 0.08 }) },
  trolley: () => { noise(0.6, { from: 120, to: 90, gain: 0.18, q: 0.6 }); tone(70, 0.5, { type: 'triangle', gain: 0.05 }) },
  pickup: () => tone(520, 0.12, { type: 'triangle', slideTo: 880, gain: 0.18 }),
  place: () => { tone(220, 0.12, { type: 'triangle', slideTo: 140, gain: 0.25 }); noise(0.08, { from: 500, to: 200, gain: 0.08 }) },
  remove: () => tone(600, 0.14, { type: 'triangle', slideTo: 300, gain: 0.15 }),
  beep: () => tone(1850, 0.12, { type: 'square', gain: 0.08 }),
  register: () => { noise(0.15, { from: 3000, to: 1500, gain: 0.1 }); tone(1320, 0.5, { delay: 0.12, gain: 0.15 }); tone(1760, 0.6, { delay: 0.2, gain: 0.12 }) },
  coin: () => { tone(1500, 0.08, { gain: 0.12 }); tone(2200, 0.15, { delay: 0.05, gain: 0.1 }) },
  note: () => noise(0.12, { from: 2500, to: 4000, gain: 0.06 }),
  confirm: () => [523, 659, 784].forEach((f, i) => tone(f, 0.25, { delay: i * 0.09, gain: 0.15 })),
  wrong: () => { tone(300, 0.18, { type: 'sawtooth', gain: 0.06 }); tone(220, 0.25, { type: 'sawtooth', delay: 0.15, gain: 0.06 }) },
  printer: () => { for (let i = 0; i < 8; i++) noise(0.06, { delay: i * 0.08, from: 1800, to: 1200, gain: 0.05, q: 4 }) },
  celebrate: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { delay: i * 0.1, type: 'triangle', gain: 0.15 })),
  click: () => tone(900, 0.05, { type: 'triangle', gain: 0.08 }),
}

export type SfxName = keyof typeof sfx

/** Haptic pulse on any connected XR controller (no-op elsewhere). */
export function haptic(session: XRSession | null | undefined, intensity = 0.6, ms = 60) {
  if (!session) return
  for (const src of session.inputSources) {
    const act = (src.gamepad as (Gamepad & { hapticActuators?: Array<{ pulse: (v: number, d: number) => Promise<boolean> }> }) | undefined)?.hapticActuators?.[0]
    void act?.pulse(intensity, ms)
  }
}
