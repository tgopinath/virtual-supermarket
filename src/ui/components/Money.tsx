import { useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { CURRENCY, DENOMINATIONS, type Denomination, type Purse } from '../../data/currency'
import { purseTotal } from '../../engine/money'

/** Educational look-alike of an Indian coin or note. Marked “PLAY MONEY”. */
export function MoneyPiece({ value, size = 1, style }: { value: Denomination; size?: number; style?: CSSProperties }) {
  const c = CURRENCY[value]
  if (c.kind === 'coin') {
    const d = (40 + value * 1.6) * size
    return (
      <div
        className="relative grid shrink-0 place-items-center rounded-full font-extrabold text-ink shadow-md"
        style={{
          width: d, height: d, fontSize: 13 * size,
          background: value === 10
            ? `radial-gradient(circle at 35% 30%, #fff8 0 8%, transparent 9%), radial-gradient(circle, ${c.color} 0 55%, #cfd8dc 56% 100%)`
            : `radial-gradient(circle at 35% 30%, #ffffffaa, ${c.color} 45%, ${c.accent})`,
          border: `2px solid ${c.accent}`,
          ...style,
        }}
        aria-label={`${c.label} coin`}
      >
        {c.label}
        <span className="absolute bottom-[14%] text-[0.45em] font-bold opacity-60">भारत</span>
      </div>
    )
  }
  const w = (92 + Math.log10(value) * 18) * size
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md font-extrabold text-ink shadow-md"
      style={{ width: w, height: w * 0.46, background: `linear-gradient(120deg, ${c.color}, ${c.color}cc 60%, ${c.accent}66)`, border: `2px solid ${c.accent}`, ...style }}
      aria-label={`${c.label} note`}
    >
      <div className="absolute left-[8%] top-1/2 grid -translate-y-1/2 place-items-center rounded-full" style={{ width: w * 0.26, height: w * 0.26, background: `${c.accent}55`, border: `1px dashed ${c.accent}` }}>
        <span style={{ fontSize: 10 * size }}>☸</span>
      </div>
      <div className="absolute right-[7%] top-[8%] leading-none" style={{ fontSize: 18 * size }}>{c.label}</div>
      <div className="absolute bottom-[8%] right-[7%] font-bold uppercase tracking-wide opacity-60" style={{ fontSize: 7 * size }}>Play money</div>
    </div>
  )
}

/**
 * A wallet piece that can be tapped (adds one) or dragged onto any element marked
 * data-drop={dropName}. Works with mouse and touch through pointer events.
 */
export function DraggableMoney({ value, dropName, onDrop, disabled, count, size = 1 }: {
  value: Denomination
  dropName: string
  onDrop: (d: Denomination) => void
  disabled?: boolean
  count?: number
  size?: number
}) {
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const down = (e: React.PointerEvent) => {
    if (disabled) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const move = (e: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) s.moved = true
    if (s.moved) setGhost({ x: e.clientX, y: e.clientY })
  }
  const up = (e: React.PointerEvent) => {
    const s = start.current
    start.current = null
    setGhost(null)
    if (!s || disabled) return
    if (!s.moved) return onDrop(value)
    const el = document.elementFromPoint(e.clientX, e.clientY)
    if (el?.closest(`[data-drop="${dropName}"]`)) onDrop(value)
  }

  return (
    <button
      type="button"
      className="relative touch-none select-none rounded-xl p-1 transition hover:-translate-y-0.5 disabled:opacity-30"
      disabled={disabled}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { start.current = null; setGhost(null) }}
      aria-label={`Add ${CURRENCY[value].label}`}
    >
      <MoneyPiece value={value} size={size} />
      {count != null && <span className="absolute -right-1 -top-1 rounded-full bg-ink px-1.5 text-xs font-bold text-white">×{count}</span>}
      {ghost && createPortal(
        <div className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 rotate-6 opacity-90" style={{ left: ghost.x, top: ghost.y }}>
          <MoneyPiece value={value} size={size * 1.1} />
        </div>,
        document.body,
      )}
    </button>
  )
}

/** A drop area showing the money placed in it; tap a piece to take it back. */
export function MoneyTray({ purse, dropName, onRemove, label, highlight }: {
  purse: Purse
  dropName: string
  onRemove: (d: Denomination) => void
  label: string
  highlight?: 'ok' | 'bad' | null
}) {
  const pieces = DENOMINATIONS.filter((d) => (purse[d] ?? 0) > 0).reverse()
  return (
    <div
      data-drop={dropName}
      className={`min-h-28 rounded-3xl border-4 border-dashed p-3 transition ${highlight === 'ok' ? 'border-emerald-500 bg-emerald-50' : highlight === 'bad' ? 'border-rose-400 bg-rose-50' : 'border-orange-300 bg-orange-50/70'}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-ink/70">{label}</span>
        <span className="text-2xl font-extrabold">₹{purseTotal(purse)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pieces.length === 0 && <span className="text-ink/50">Drag or tap money here</span>}
        {pieces.map((d) => (
          <button key={d} type="button" className="relative anim-pop" onClick={() => onRemove(d)} aria-label={`Remove ${CURRENCY[d].label}`}>
            <MoneyPiece value={d} size={0.8} />
            {(purse[d] ?? 0) > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 text-xs font-bold text-white">×{purse[d]}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
