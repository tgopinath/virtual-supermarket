import { useEffect, useState, type ReactNode } from 'react'
import { speak } from '../../audio/voice'
import { useProgress } from '../../store/progressStore'
import { useSession, type BuddyMood } from '../../store/sessionStore'

export function Stars({ n, of = 3, size = 'text-2xl' }: { n: number; of?: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => <span key={i} className={i < n ? 'text-amber-400' : 'text-black/15'}>★</span>)}
    </span>
  )
}

export function CoinBadge() {
  const coins = useProgress((s) => s.coins)
  const stars = useProgress((s) => s.stars)
  return (
    <div className="flex items-center gap-2">
      <span className="chip bg-amber-100 text-amber-800">🪙 {coins}</span>
      <span className="chip bg-yellow-100 text-yellow-800">⭐ {stars}</span>
    </div>
  )
}

export function ScreenShell({ title, back, children, wide }: { title: string; back?: () => void; children: ReactNode; wide?: boolean }) {
  const profile = useProgress((s) => s.profile)
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_20%_0%,#ffe0cc,transparent_40%),radial-gradient(circle_at_90%_10%,#d9f2ff,transparent_35%)] pb-10">
      <header className="vs-shell-header sticky top-0 z-20 flex items-center gap-3 bg-cream/80 px-4 py-3 backdrop-blur">
        {back && <button className="btn-ghost px-3 py-2" onClick={back} aria-label="Back">←</button>}
        <h1 className="flex-1 truncate text-2xl font-extrabold text-ink">{title}</h1>
        <CoinBadge />
        {profile && <span className="text-3xl" title={profile.nickname}>{profile.avatar}</span>}
      </header>
      <main className={`mx-auto px-4 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>{children}</main>
    </div>
  )
}

const FACES: Record<BuddyMood, string> = { happy: '😊', thinking: '🤔', celebrate: '🤩', oops: '😮' }

/** ShopBuddy's 2D speech bubble with subtitles and a replay button. */
export function BuddyBubble({ compact }: { compact?: boolean }) {
  const buddy = useSession((s) => s.buddy)
  const subtitles = useProgress((s) => s.settings.subtitles)
  const [hidden, setHidden] = useState(false)
  useEffect(() => setHidden(false), [buddy?.at])
  if (!buddy || hidden) return null
  return (
    <div className={`pointer-events-auto flex items-end gap-2 anim-rise ${compact ? 'max-w-sm' : 'max-w-md'}`} key={buddy.at}>
      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-3xl shadow-lg ${buddy.mood === 'celebrate' ? 'anim-wobble' : 'anim-float'}`} aria-hidden>
        {FACES[buddy.mood]}
      </div>
      {subtitles && (
        <div className="panel relative px-4 py-2 text-base leading-snug" role="status" aria-live="polite">
          <div className="text-xs font-bold uppercase tracking-wide text-brand">ShopBuddy</div>
          {buddy.text}
          <div className="mt-1 flex gap-2">
            <button className="text-sm font-bold text-sky-700" onClick={() => speak(buddy.text)}>🔊 Again</button>
            <button className="text-sm font-bold text-ink/50" onClick={() => setHidden(true)}>Hide</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AchievementToasts() {
  const toasts = useSession((s) => s.toasts)
  const dismiss = useSession((s) => s.dismissToast)
  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => dismiss(toasts[0].id), 4200)
    return () => clearTimeout(t)
  }, [toasts, dismiss])
  if (!toasts.length) return null
  const { achievement: a, id } = toasts[0]
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex justify-center px-4">
      <button className="panel pointer-events-auto flex items-center gap-3 px-5 py-3 anim-pop" onClick={() => dismiss(id)}>
        <span className="text-4xl">{a.icon}</span>
        <span className="text-left">
          <span className="block text-xs font-bold uppercase tracking-wide text-amber-600">Achievement unlocked!</span>
          <span className="block text-xl font-extrabold">{a.title}</span>
          <span className="block text-sm text-ink/60">+{a.coins} coins</span>
        </span>
      </button>
    </div>
  )
}

export function Modal({ children, onClose, title }: { children: ReactNode; onClose?: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="panel max-h-[90vh] w-full max-w-lg overflow-auto p-5 anim-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">{title}</h2>
            {onClose && <button className="btn-ghost px-3 py-1" onClick={onClose} aria-label="Close">✕</button>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i)
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <span key={i} className="absolute top-[-5vh] h-3 w-2 rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: ['#ff7a45', '#ffd54f', '#4dd0e1', '#81c784', '#ba68c8'][i % 5], animation: `confetti ${2 + (i % 5) * 0.4}s linear ${(i % 7) * 0.15}s forwards` }} />
      ))}
    </div>
  )
}

export function Bar({ value, color = 'bg-brand' }: { value: number; color?: string }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-black/10">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  )
}

export function Keypad({ value, onChange, onSubmit, submitLabel = 'Check' }: { value: string; onChange: (v: string) => void; onSubmit: () => void; submitLabel?: string }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']
  return (
    <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
      <div className="col-span-3 rounded-2xl bg-ink px-4 py-3 text-right text-3xl font-extrabold text-emerald-300" aria-live="polite">₹{value || '0'}</div>
      {keys.map((k) => (
        <button key={k} className={k === '✓' ? 'btn-green' : 'btn-ghost text-2xl'} aria-label={k === '✓' ? submitLabel : k === '⌫' ? 'Delete' : k}
          onClick={() => (k === '⌫' ? onChange(value.slice(0, -1)) : k === '✓' ? onSubmit() : value.length < 5 && onChange(value + k))}>
          {k}
        </button>
      ))}
    </div>
  )
}
