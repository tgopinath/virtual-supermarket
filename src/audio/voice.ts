// ShopBuddy's voice: browser speech synthesis, preferring an Indian English voice.

let voiceOn = true
let chosen: SpeechSynthesisVoice | null = null

export const setVoiceEnabled = (on: boolean) => {
  voiceOn = on
  if (!on) window.speechSynthesis?.cancel()
}

function pickVoice(): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis
  if (!synth) return null
  const voices = synth.getVoices()
  return (
    voices.find((v) => v.lang === 'en-IN') ??
    voices.find((v) => v.lang.startsWith('en-IN')) ??
    voices.find((v) => /india/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  )
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { chosen = pickVoice() }
}

export function speak(text: string) {
  if (!voiceOn || typeof window === 'undefined' || !window.speechSynthesis) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/₹\s?([\d,]+)/g, '$1 rupees').replace(/×/g, 'times'))
  chosen ??= pickVoice()
  if (chosen) u.voice = chosen
  u.lang = chosen?.lang ?? 'en-IN'
  u.rate = 0.95
  u.pitch = 1.15
  synth.speak(u)
}
