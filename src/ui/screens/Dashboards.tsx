import { useMemo, useState } from 'react'
import { DEPARTMENTS, PRODUCTS, productsIn } from '../../data/products'
import { LEVELS, MAX_LEVEL } from '../../engine/levels'
import { ACHIEVEMENTS, SHOP_ITEMS, skillAccuracy, type ShopItemKind, type Tally } from '../../engine/rewards'
import { useProgress } from '../../store/progressStore'
import { useSession } from '../../store/sessionStore'
import { Bar, Confetti, ScreenShell, Stars } from '../components/Kit'

export function CompleteOverlay() {
  const r = useSession((s) => s.lastResult)
  const s = useSession.getState()
  if (!r) return null
  const again = () => {
    if (r.kind === 'quiz' && s.quiz) s.startQuiz(s.quiz.kind, s.quiz.level)
    else s.startShop(s.challenge?.mode ?? 'free', s.level)
  }
  const nextLevel = r.nextLevel && r.nextLevel <= MAX_LEVEL ? LEVELS[r.nextLevel - 1] : null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-auto bg-black/30 p-4">
      {r.success && <Confetti />}
      <div className="panel relative w-full max-w-lg p-6 text-center anim-pop">
        <div className="text-6xl">{r.success ? '🏆' : '💪'}</div>
        <h2 className="text-4xl font-extrabold">{r.title}</h2>
        <Stars n={r.stars} size="text-5xl" />
        <ul className="mt-3 space-y-1 text-left text-lg">{r.lines.map((l, i) => <li key={i}>• {l}</li>)}</ul>
        {r.evaluation?.healthy && (
          <ul className="mt-2 space-y-1 text-left">{r.evaluation.healthy.checks.map((c) => <li key={c.label}>{c.ok ? '✅' : '❌'} {c.label}</li>)}</ul>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="chip bg-amber-100 text-lg text-amber-800">+{r.award.coins} 🪙</span>
          <span className="chip bg-yellow-100 text-lg text-yellow-800">+{r.award.stars} ⭐</span>
          {r.award.achievements.map((a) => <span key={a.id} className="chip bg-violet-100 text-lg text-violet-800">{a.icon} {a.title}</span>)}
        </div>
        {nextLevel && <p className="mt-3 rounded-2xl bg-emerald-50 p-2 text-lg font-bold text-emerald-800">🔓 Level {nextLevel.level} unlocked: {nextLevel.title}!</p>}
        {r.nextLevel === MAX_LEVEL + 1 && <p className="mt-3 rounded-2xl bg-amber-50 p-2 text-lg font-bold text-amber-800">👑 You finished every level — Supermarket Champion!</p>}
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button className="btn-primary" onClick={again}>Play again</button>
          {nextLevel ? <button className="btn-green" onClick={() => s.goto('levels')}>Next level</button> : <button className="btn-ghost" onClick={() => s.goto('rewards')}>Rewards</button>}
          <button className="btn-ghost" onClick={() => s.goto('modes')}>Menu</button>
        </div>
      </div>
    </div>
  )
}

export function RewardsScreen() {
  const p = useProgress()
  const goto = useSession((s) => s.goto)
  const [msg, setMsg] = useState<string | null>(null)
  const kinds: Array<[ShopItemKind, string]> = [['trolley', 'Trolley designs'], ['environment', 'Supermarket themes'], ['accessory', 'ShopBuddy accessories']]
  return (
    <ScreenShell title="Rewards" back={() => goto('modes')}>
      <h2 className="mt-4 text-2xl font-extrabold">Badges</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const got = p.achievements.includes(a.id)
          return (
            <div key={a.id} className={`panel p-4 text-center ${got ? '' : 'opacity-50 grayscale'}`}>
              <div className="text-5xl">{got ? a.icon : '🔒'}</div>
              <div className="mt-1 font-extrabold leading-tight">{a.title}</div>
              <div className="text-sm text-ink/60">{a.description}</div>
            </div>
          )
        })}
      </div>
      <h2 className="mt-6 text-2xl font-extrabold">Reward shop</h2>
      {msg && <p className="mt-2 rounded-xl bg-amber-50 p-2 font-bold" role="status">{msg}</p>}
      {kinds.map(([kind, label]) => (
        <section key={kind} className="mt-3">
          <h3 className="mb-2 text-lg font-bold text-ink/70">{label}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SHOP_ITEMS.filter((i) => i.kind === kind).map((item) => {
              const owned = p.owned.includes(item.id)
              const equipped = p.equipped[kind] === item.id
              return (
                <button key={item.id} className={`panel p-3 text-center transition hover:-translate-y-0.5 ${equipped ? 'ring-4 ring-brand' : ''}`}
                  onClick={() => {
                    if (owned) { p.equip(item.id); setMsg(`${item.name} equipped!`) }
                    else { const err = p.buy(item.id); setMsg(err ?? `You unlocked ${item.name}!`) }
                  }}>
                  <div className="text-4xl">{item.icon}</div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-sm">{equipped ? 'Equipped' : owned ? 'Tap to use' : `🪙 ${item.cost}`}</div>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </ScreenShell>
  )
}

const pct = (t?: Tally) => (t && t.total ? `${Math.round(skillAccuracy(t) * 100)}%` : '—')
const sum = (...ts: Array<Tally | undefined>): Tally => ts.reduce<Tally>((a, b) => ({ correct: a.correct + (b?.correct ?? 0), total: a.total + (b?.total ?? 0) }), { correct: 0, total: 0 })

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-sm font-bold text-ink/60">{label}</div>
      <div className="text-3xl font-extrabold">{value}</div>
      {sub && <div className="text-sm text-ink/60">{sub}</div>}
    </div>
  )
}

function CategoryProgress() {
  const ids = useProgress((s) => s.stats.productsIdentified)
  return (
    <div className="panel p-4">
      <h3 className="mb-2 text-lg font-extrabold">Products discovered by aisle</h3>
      <div className="space-y-2">
        {DEPARTMENTS.map((d) => {
          const all = productsIn(d.id)
          const n = all.filter((p) => ids.includes(p.id)).length
          return (
            <div key={d.id}>
              <div className="flex justify-between text-sm font-bold"><span>{d.icon} {d.name}</span><span>{n}/{all.length}</span></div>
              <Bar value={n / all.length} color="bg-emerald-500" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ProgressScreen() {
  const p = useProgress()
  const goto = useSession((s) => s.goto)
  return (
    <ScreenShell title="My progress" back={() => goto('modes')}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Level" value={p.unlockedLevel > MAX_LEVEL ? '★ All' : p.unlockedLevel} sub={`of ${MAX_LEVEL}`} />
        <Stat label="Coins" value={p.coins} />
        <Stat label="Stars" value={p.stars} />
        <Stat label="Badges" value={`${p.achievements.length}/${ACHIEVEMENTS.length}`} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CategoryProgress />
        <div className="panel p-4">
          <h3 className="mb-2 text-lg font-extrabold">Level stars</h3>
          {LEVELS.map((l) => (
            <div key={l.level} className="flex items-center justify-between border-b border-black/5 py-1"><span>{l.level}. {l.title}</span><Stars n={p.levelStars[l.level] ?? 0} size="text-lg" /></div>
          ))}
        </div>
      </div>
    </ScreenShell>
  )
}

function ParentGate({ onPass }: { onPass: () => void }) {
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4)], [])
  const [v, setV] = useState('')
  return (
    <div className="panel mx-auto mt-10 max-w-sm p-6 text-center">
      <div className="text-5xl">👪</div>
      <h2 className="text-2xl font-extrabold">For grown-ups</h2>
      <p className="text-ink/70">Please answer to continue: what is {a} × {b}?</p>
      <form onSubmit={(e) => { e.preventDefault(); if (Number(v) === a * b) onPass(); else setV('') }}>
        <input className="mt-3 w-full rounded-2xl border-2 border-black/10 px-4 py-3 text-center text-2xl" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} aria-label="Answer" autoFocus />
        <button className="btn-primary mt-3 w-full">Continue</button>
      </form>
    </div>
  )
}

export function ParentDashboard() {
  const p = useProgress()
  const goto = useSession((s) => s.goto)
  const [ok, setOk] = useState(false)
  const back = () => goto(p.profile ? 'modes' : 'welcome')
  if (!ok) return <ScreenShell title="Parent dashboard" back={back}><ParentGate onPass={() => setOk(true)} /></ScreenShell>
  const s = p.stats
  const mins = Math.round(s.timeMs / 60000)
  const money = sum(s.skills.currency, s.skills['make-amount'], s.skills.equivalent)
  const change = sum(s.skills.change)
  const addition = sum(s.skills.addition, s.skills.multiplication)
  const subtraction = sum(s.skills.subtraction)
  const ch = s.challenges
  const challengesWon = ch.shopping.won + ch.budget.won + ch.healthy.won + ch.timed.won
  const challengesPlayed = ch.shopping.played + ch.budget.played + ch.healthy.played + ch.timed.played
  const skillRows: Array<[string, Tally]> = [
    ['Identifying products', sum(s.skills.identify, s.skills.department)],
    ['Reading prices', sum(s.skills.price)],
    ['Addition & multiplication', addition],
    ['Subtraction', subtraction],
    ['Comparing value', sum(s.skills.comparison)],
    ['Currency recognition', money],
    ['Calculating change', change],
  ]
  return (
    <ScreenShell title="Parent dashboard" back={back} wide>
      <p className="mt-3 text-ink/70">
        Shopper <b>{p.profile ? `${p.profile.avatar} ${p.profile.nickname}` : '—'}</b>. Only a nickname, avatar and age band are stored, on this device only (IndexedDB). Nothing is sent anywhere.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sessions" value={s.sessions} />
        <Stat label="Time learning" value={`${mins} min`} />
        <Stat label="Products identified" value={`${s.productsIdentified.length}/${PRODUCTS.length}`} />
        <Stat label="Current level" value={p.unlockedLevel > MAX_LEVEL ? 'Done' : p.unlockedLevel} sub={p.unlockedLevel <= MAX_LEVEL ? LEVELS[p.unlockedLevel - 1].title : 'All levels complete'} />
        <Stat label="Challenges won" value={`${challengesWon}/${challengesPlayed}`} />
        <Stat label="Purchases completed" value={s.purchases} />
        <Stat label="Budget challenges" value={`${s.budget.won}/${s.budget.played}`} sub={s.budget.won ? `₹${s.budget.savedTotal} kept under budget in total` : undefined} />
        <Stat label="Achievements" value={`${p.achievements.length}/${ACHIEVEMENTS.length}`} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="panel p-4">
          <h3 className="mb-2 text-lg font-extrabold">Accuracy by skill (first try)</h3>
          {skillRows.map(([label, t]) => (
            <div key={label} className="mb-2">
              <div className="flex justify-between text-sm font-bold"><span>{label}</span><span>{pct(t)} <span className="font-normal text-ink/50">({t.correct}/{t.total})</span></span></div>
              <Bar value={t.total ? t.correct / t.total : 0} color={!t.total ? 'bg-black/10' : t.correct / t.total >= 0.8 ? 'bg-emerald-500' : t.correct / t.total >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'} />
            </div>
          ))}
        </div>
        <CategoryProgress />
        <div className="panel p-4">
          <h3 className="mb-2 text-lg font-extrabold">Shopping modes</h3>
          <table className="w-full text-left"><thead className="text-sm text-ink/60"><tr><th>Mode</th><th>Played</th><th>Won</th></tr></thead>
            <tbody>{(Object.keys(ch) as Array<keyof typeof ch>).map((k) => <tr key={k} className="border-t border-black/5"><td className="py-1 capitalize">{k}</td><td>{ch[k].played}</td><td>{k === 'free' ? '—' : ch[k].won}</td></tr>)}</tbody>
          </table>
          {s.bestTimedSec != null && <p className="mt-2 text-sm">Fastest timed round: {s.bestTimedSec}s</p>}
        </div>
        <div className="panel p-4">
          <h3 className="mb-2 text-lg font-extrabold">Recent activity</h3>
          {s.history.length === 0 && <p className="text-ink/60">No activity yet.</p>}
          <ul className="max-h-64 space-y-1 overflow-auto text-sm">
            {s.history.map((h, i) => (
              <li key={i} className="flex justify-between border-b border-black/5 py-1"><span>{h.success ? '✅' : '➖'} {h.activity} · {h.detail}</span><span className="text-ink/50">{new Date(h.at).toLocaleDateString('en-IN')}</span></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button className="btn bg-rose-600 text-white" onClick={() => { if (window.confirm('Erase all progress, rewards and the profile on this device? This cannot be undone.')) { p.resetAll(); goto('welcome') } }}>Reset all progress</button>
      </div>
    </ScreenShell>
  )
}

export function SettingsScreen() {
  const settings = useProgress((s) => s.settings)
  const update = useProgress((s) => s.updateSettings)
  const goto = useSession((s) => s.goto)
  const Toggle = ({ k, label }: { k: 'sound' | 'voice' | 'subtitles'; label: string }) => (
    <label className="flex items-center justify-between border-b border-black/5 py-3 text-xl font-bold">
      {label}
      <input type="checkbox" className="h-7 w-7 accent-[#ff7a45]" checked={settings[k]} onChange={(e) => update({ [k]: e.target.checked })} />
    </label>
  )
  return (
    <ScreenShell title="Settings" back={() => goto('modes')}>
      <div className="panel mt-4 p-5">
        <Toggle k="sound" label="🔈 Sound effects" />
        <Toggle k="voice" label="🗣️ ShopBuddy voice (Indian English when available)" />
        <Toggle k="subtitles" label="💬 Subtitles" />
        <div className="py-3">
          <div className="text-xl font-bold">🎨 Graphics quality</div>
          <p className="text-sm text-ink/60">Low is smoother on older phones. High adds shadows and more products on shelves.</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <button key={q} className={settings.quality === q ? 'btn-primary capitalize' : 'btn-ghost capitalize'} onClick={() => update({ quality: q })}>{q}</button>
            ))}
          </div>
        </div>
        <button className="btn-ghost mt-2" onClick={() => goto('age')}>Change age group</button>
      </div>
    </ScreenShell>
  )
}
