import { useState } from 'react'
import { sfx } from '../../audio/audio'
import { AGE_GROUPS, type AgeGroup, type ShoppingMode } from '../../engine/challenges'
import { LEVELS, MAX_LEVEL } from '../../engine/levels'
import { useProgress } from '../../store/progressStore'
import { useSession } from '../../store/sessionStore'
import { BuddyBubble, CoinBadge, ScreenShell, Stars } from '../components/Kit'

const AVATARS = ['🦁', '🐯', '🐼', '🐵', '🐰', '🦊', '🐨', '🐸', '🦄', '🐶', '🐱', '🐻']

export function WelcomeScreen() {
  const profile = useProgress((s) => s.profile)
  const goto = useSession((s) => s.goto)
  const say = useSession((s) => s.say)
  return (
    <div className="grid min-h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,#ffd0b5,transparent_45%),radial-gradient(circle_at_80%_70%,#c9ecff,transparent_45%)] p-6">
      <div className="max-w-xl text-center">
        <div className="mb-2 text-7xl anim-float" aria-hidden>🛒</div>
        <h1 className="text-5xl font-extrabold leading-tight text-brand-dark sm:text-6xl">My Supermarket</h1>
        <p className="mt-3 text-xl text-ink/70">Explore the aisles, read prices, count rupees and pay at the counter — all in 3D!</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          {profile ? (
            <>
              <button className="btn-primary px-10 py-4 text-2xl" onClick={() => { sfx.confirm(); say(`Welcome back, ${profile.nickname}! What shall we do today?`); goto('modes') }}>
                Play as {profile.avatar} {profile.nickname}
              </button>
              <button className="btn-ghost" onClick={() => goto('avatar')}>Change player</button>
            </>
          ) : (
            <button className="btn-primary px-10 py-4 text-2xl" onClick={() => { sfx.confirm(); say('Hello! I am ShopBuddy. Pick a friend to shop with!'); goto('avatar') }}>
              Let’s start!
            </button>
          )}
          <button className="text-sm font-bold text-ink/50 underline" onClick={() => goto('parent')}>Grown-ups: parent dashboard</button>
        </div>
      </div>
      <div className="fixed bottom-4 left-4"><BuddyBubble compact /></div>
    </div>
  )
}

export function AvatarScreen() {
  const profile = useProgress((s) => s.profile)
  const setProfile = useProgress((s) => s.setProfile)
  const goto = useSession((s) => s.goto)
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0])
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const clean = nickname.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 12)
  return (
    <ScreenShell title="Choose your shopper" back={() => goto('welcome')}>
      <div className="panel mt-4 p-5">
        <h2 className="mb-3 text-xl font-bold">Pick an avatar</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {AVATARS.map((a) => (
            <button key={a} onClick={() => { sfx.click(); setAvatar(a) }} aria-pressed={a === avatar}
              className={`aspect-square rounded-3xl text-5xl transition ${a === avatar ? 'scale-105 bg-orange-100 ring-4 ring-brand' : 'bg-white ring-1 ring-black/10 hover:bg-orange-50'}`}>
              {a}
            </button>
          ))}
        </div>
        <label className="mt-6 block">
          <span className="text-xl font-bold">Your shopper nickname</span>
          <input className="mt-2 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-2xl focus:border-brand focus:outline-none"
            value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={12} placeholder="e.g. Super Star" />
          <span className="mt-1 block text-sm text-ink/50">A fun nickname only — no real names needed. Everything stays on this device.</span>
        </label>
        <button className="btn-primary mt-6 w-full text-2xl" disabled={!clean}
          onClick={() => { setProfile({ avatar, nickname: clean, age: profile?.age ?? 'middle' }); sfx.confirm(); goto('age') }}>
          Next →
        </button>
      </div>
    </ScreenShell>
  )
}

export function AgeScreen() {
  const profile = useProgress((s) => s.profile)
  const setProfile = useProgress((s) => s.setProfile)
  const goto = useSession((s) => s.goto)
  const say = useSession((s) => s.say)
  return (
    <ScreenShell title="How old are you?" back={() => goto('avatar')}>
      <p className="mt-4 text-lg text-ink/70">This sets how tricky the sums and shopping lists are. It gets harder as you finish levels.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {(Object.keys(AGE_GROUPS) as AgeGroup[]).map((k, i) => (
          <button key={k} className={`panel p-6 text-center transition hover:-translate-y-1 ${profile?.age === k ? 'ring-4 ring-brand' : ''}`}
            onClick={() => {
              if (!profile) return goto('avatar')
              setProfile({ ...profile, age: k })
              sfx.confirm()
              say(`Great, ${profile.nickname}! Let us go shopping.`)
              goto('modes')
            }}>
            <div className="text-5xl">{['🧒', '👦', '🧑'][i]}</div>
            <div className="mt-2 text-3xl font-extrabold">Ages {AGE_GROUPS[k].ages}</div>
            <div className="text-lg text-ink/60">{AGE_GROUPS[k].label}</div>
            <div className="mt-2 text-amber-500">{'★'.repeat(i + 1)}</div>
          </button>
        ))}
      </div>
    </ScreenShell>
  )
}

const MODES: Array<{ id: string; title: string; desc: string; icon: string; color: string; run: (s: ReturnType<typeof useSession.getState>) => void }> = [
  { id: 'free', title: 'Free Shopping', desc: 'Explore every aisle and buy anything.', icon: '🛍️', color: 'from-orange-400 to-rose-400', run: (s) => s.startShop('free') },
  { id: 'shopping', title: 'Shopping Challenge', desc: 'Find the items on your list.', icon: '📝', color: 'from-sky-400 to-indigo-400', run: (s) => s.startShop('shopping') },
  { id: 'budget', title: 'Budget Challenge', desc: 'Buy your list without overspending.', icon: '💰', color: 'from-emerald-400 to-teal-500', run: (s) => s.startShop('budget') },
  { id: 'money', title: 'Money Learning', desc: 'Coins, notes, making amounts and change.', icon: '🪙', color: 'from-amber-400 to-orange-500', run: (s) => s.startQuiz('money') },
  { id: 'math', title: 'Maths Challenge', desc: 'Totals, change and best value.', icon: '➕', color: 'from-violet-400 to-fuchsia-500', run: (s) => s.startQuiz('math') },
  { id: 'healthy', title: 'Healthy Shopping', desc: 'Build a balanced, healthy basket.', icon: '🥦', color: 'from-lime-400 to-green-500', run: (s) => s.startShop('healthy') },
  { id: 'timed', title: 'Timed Shopping', desc: 'Beat the clock — accuracy wins!', icon: '⏱️', color: 'from-rose-400 to-red-500', run: (s) => s.startShop('timed') },
]

export function ModesScreen() {
  const profile = useProgress((s) => s.profile)
  const unlocked = useProgress((s) => s.unlockedLevel)
  const goto = useSession((s) => s.goto)
  return (
    <ScreenShell title={`Hi ${profile?.nickname ?? 'shopper'}!`} back={() => goto('welcome')} wide>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-2xl font-extrabold">Pick a game</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => { sfx.click(); m.run(useSession.getState()) }}
                className={`group rounded-3xl bg-gradient-to-br ${m.color} p-5 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl`}>
                <div className="text-5xl drop-shadow transition group-hover:scale-110">{m.icon}</div>
                <div className="mt-2 text-2xl font-extrabold leading-tight">{m.title}</div>
                <div className="text-white/90">{m.desc}</div>
              </button>
            ))}
            <button onClick={() => goto('ar')} className="rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-left text-white shadow-lg transition hover:-translate-y-1">
              <div className="text-5xl">🪄</div>
              <div className="mt-2 text-2xl font-extrabold">AR Mode</div>
              <div className="text-white/80">Put a mini supermarket on your table.</div>
            </button>
          </div>
        </section>
        <aside className="space-y-4">
          <button className="panel w-full p-5 text-left transition hover:-translate-y-1" onClick={() => goto('levels')}>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold">Learning Path</span>
              <span className="text-3xl">🗺️</span>
            </div>
            <div className="mt-1 text-ink/70">{unlocked > MAX_LEVEL ? 'All 8 levels complete!' : `Level ${unlocked}: ${LEVELS[unlocked - 1].title}`}</div>
            <div className="mt-3 flex gap-1">
              {LEVELS.map((l) => <span key={l.level} className={`h-3 flex-1 rounded-full ${l.level < unlocked ? 'bg-emerald-500' : l.level === unlocked ? 'bg-brand' : 'bg-black/10'}`} />)}
            </div>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost flex-col py-4" onClick={() => goto('rewards')}><span className="text-3xl">🏆</span>Rewards</button>
            <button className="btn-ghost flex-col py-4" onClick={() => goto('progress')}><span className="text-3xl">📈</span>My progress</button>
            <button className="btn-ghost flex-col py-4" onClick={() => goto('settings')}><span className="text-3xl">⚙️</span>Settings</button>
            <button className="btn-ghost flex-col py-4" onClick={() => goto('parent')}><span className="text-3xl">👪</span>Parents</button>
          </div>
          <BuddyBubble compact />
        </aside>
      </div>
    </ScreenShell>
  )
}

export function LevelsScreen() {
  const unlocked = useProgress((s) => s.unlockedLevel)
  const levelStars = useProgress((s) => s.levelStars)
  const goto = useSession((s) => s.goto)
  const start = (level: number) => {
    const def = LEVELS[level - 1]
    const s = useSession.getState()
    sfx.click()
    if (def.activity.type === 'quiz') s.startQuiz(def.activity.quiz, level)
    else s.startShop(def.activity.mode as ShoppingMode, level)
  }
  return (
    <ScreenShell title="Learning Path" back={() => goto('modes')}>
      <p className="mt-4 text-lg text-ink/70">Finish a level to unlock the next one. Each level gets a little harder.</p>
      <ol className="relative mt-4 space-y-3">
        {LEVELS.map((l) => {
          const locked = l.level > unlocked
          const done = l.level < unlocked
          return (
            <li key={l.level}>
              <button disabled={locked} onClick={() => start(l.level)}
                className={`panel flex w-full items-center gap-4 p-4 text-left transition ${locked ? 'opacity-50' : 'hover:-translate-y-0.5'} ${l.level === unlocked ? 'ring-4 ring-brand' : ''}`}>
                <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-extrabold text-white ${done ? 'bg-emerald-500' : locked ? 'bg-black/30' : 'bg-brand'}`}>
                  {locked ? '🔒' : l.level}
                </span>
                <span className="flex-1">
                  <span className="block text-xl font-extrabold">Level {l.level} – {l.title}</span>
                  <span className="block text-ink/60">{l.goal}</span>
                </span>
                <Stars n={levelStars[l.level] ?? 0} />
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-6 flex justify-end"><CoinBadge /></div>
    </ScreenShell>
  )
}
