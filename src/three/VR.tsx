import { Text } from '@react-three/drei'
import { TeleportTarget, XROrigin, useXR } from '@react-three/xr'
import { useEffect, useState } from 'react'
import { DENOMINATIONS } from '../data/currency'
import { DEPARTMENTS, getProduct } from '../data/products'
import { cartCount, cartTotal } from '../engine/cart'
import { evaluate } from '../engine/challenges'
import { billTotal } from '../engine/checkout'
import { purseTotal } from '../engine/money'
import { useSession, type CameraTarget } from '../store/sessionStore'
import { xrStore } from '../xr/xrStore'
import { STORE, viewFor, type Vec3 } from './layout'
import { Button3D, Label, Money3D, Panel3D } from './Panel3D'

export const useInXR = () => useXR((s) => s.mode !== null)

const standAt = (t: CameraTarget): Vec3 => {
  const v = viewFor(t)
  return [v.pos[0], 0, v.pos[2] - 0.6]
}

/** Owns the VR player position: teleport on the floor, jump to departments from the wrist panel. */
export function useVRPlayer() {
  const inXR = useInXR()
  const phase = useSession((s) => s.phase)
  const target = useSession((s) => s.camera.target)
  const [pos, setPos] = useState<Vec3>(standAt('entrance'))
  useEffect(() => { if (inXR) setPos(standAt(target === 'outside' ? 'outside' : target)) }, [inXR, target])
  useEffect(() => { if (inXR && phase === 'checkout') setPos(standAt('checkout')) }, [inXR, phase])
  return { inXR, pos, setPos }
}

export function VRRig({ pos, setPos }: { pos: Vec3; setPos: (p: Vec3) => void }) {
  return (
    <>
      <XROrigin position={pos} />
      <TeleportTarget onTeleport={(p) => setPos([p.x, 0, p.z])}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} visible={false}>
          <planeGeometry args={[STORE.halfW * 2 - 1, STORE.halfD * 2 - 1]} />
        </mesh>
      </TeleportTarget>
    </>
  )
}

/** Floating panel beside the player: list, totals and quick travel. */
export function VRHud({ pos }: { pos: Vec3 }) {
  const s = useSession()
  if (s.screen !== 'store' || s.phase === 'checkout') return null
  const ch = s.challenge
  const ev = ch ? evaluate(ch, s.cart, s.elapsedSec()) : null
  const lines: string[] = []
  if (ch?.list.length) ev!.items.forEach((i) => lines.push(`${i.done ? '[x]' : '[ ]'} ${getProduct(i.productId).name}  ${i.have}/${i.need}`))
  if (ch?.healthy) ev!.healthy!.checks.forEach((c) => lines.push(`${c.ok ? '[x]' : '[ ]'} ${c.label}`))
  return (
    <Panel3D width={0.62} height={0.78} position={[pos[0] - 0.55, 1.25, pos[2] - 0.6]} rotation={[-0.2, 0.55, 0]}>
      <Label position={[-0.28, 0.34, 0]} size={0.04} color="#e64a19">{ch?.title ?? 'Shopping'}</Label>
      <Label position={[-0.28, 0.29, 0]} size={0.028}>{`${cartCount(s.cart)} items · total ₹${cartTotal(s.cart)}${ch?.budget ? ` · left ₹${ch.budget - cartTotal(s.cart)}` : ''}`}</Label>
      {ch?.timeLimit && <Label position={[-0.28, 0.255, 0]} size={0.026} color="#c62828">{`Time left: ${Math.max(0, Math.ceil(ch.timeLimit - s.elapsedSec()))} s`}</Label>}
      {lines.slice(0, 7).map((l, i) => <Label key={i} position={[-0.28, 0.21 - i * 0.035, 0]} size={0.025}>{l}</Label>)}
      {!s.hasTrolley && s.phase === 'shopping' && <Button3D label="Take trolley" onPress={s.takeTrolley} position={[0, -0.05, 0]} width={0.3} />}
      <group position={[0, -0.13, 0]}>
        {DEPARTMENTS.map((d, i) => (
          <Button3D key={d.id} label={d.name.split(' ')[0]} color={d.color} width={0.18} height={0.05}
            position={[((i % 3) - 1) * 0.19, -Math.floor(i / 3) * 0.06, 0]} onPress={() => s.flyTo(d.id)} />
        ))}
      </group>
      {s.phase === 'outside'
        ? <Button3D label="Enter store" onPress={s.enterStore} position={[0, -0.33, 0]} width={0.3} />
        : <Button3D label="Go to checkout" onPress={s.goCheckout} position={[0, -0.33, 0]} width={0.34} color="#2e7d32" />}
      {s.cart.length > 0 && (
        <Button3D label="Remove last" onPress={() => s.removeLine(s.cart[s.cart.length - 1].productId)} position={[0.22, 0.34, 0]} width={0.16} height={0.045} color="#757575" />
      )}
    </Panel3D>
  )
}

/** Spatial checkout: scan by pointing at items on the belt, pay with 3D money. */
export function VRCheckoutPanel() {
  const s = useSession()
  const c = s.checkout
  if (!c || s.screen !== 'store') return null
  const total = billTotal(c.bill)
  const anchor: Vec3 = [-8 + 1.7, 1.35, 6 + 0.9]
  return (
    <Panel3D width={0.8} height={0.62} position={anchor} rotation={[-0.15, -0.5, 0]}>
      <Label position={[-0.37, 0.27, 0]} size={0.04} color="#e64a19">{`Bill: ₹${total}`}</Label>
      {s.checkoutMsg && <Label position={[-0.37, 0.22, 0]} size={0.026} color={s.checkoutMsg.ok ? '#2e7d32' : '#c62828'}>{s.checkoutMsg.text}</Label>}
      {c.phase === 'scan' && (
        <>
          <Label position={[-0.37, 0.15, 0]} size={0.03}>{`Point at each item on the belt and press to scan (${c.queue.length} left).`}</Label>
          {c.queue.slice(0, 6).map((l, i) => (
            <Button3D key={l.productId} label={`Scan ${getProduct(l.productId).name} ×${l.qty}`} width={0.36} height={0.05}
              position={[(i % 2 ? 0.19 : -0.19), 0.05 - Math.floor(i / 2) * 0.065, 0]} onPress={() => s.scanItem(l.productId)} />
          ))}
        </>
      )}
      {c.phase === 'method' && (
        <group position={[0, 0.05, 0]}>
          <Label position={[-0.37, 0.08, 0]} size={0.032}>How will you pay?</Label>
          <Button3D label="Cash" onPress={() => s.chooseMethod('cash')} position={[-0.2, 0, 0]} />
          <Button3D label="Card" onPress={() => s.chooseMethod('card')} position={[0.05, 0, 0]} disabled={s.cardBalance <= 0} color="#1e88e5" />
          <Button3D label="UPI" onPress={() => s.chooseMethod('upi')} position={[0.29, 0, 0]} disabled={s.cardBalance <= 0} color="#6a1b9a" />
        </group>
      )}
      {(c.phase === 'cash' || c.phase === 'change') && (
        <MoneyPad
          title={c.phase === 'cash' ? `Tray: ₹${purseTotal(c.tray)} — press money from your wallet` : `Change due ₹${c.changeDue}. Counted: ₹${purseTotal(c.changeTray)}`}
          counts={c.phase === 'cash' ? s.wallet : undefined}
          tray={c.phase === 'cash' ? c.tray : c.changeTray}
          onAdd={c.phase === 'cash' ? s.trayAdd : s.changeAdd}
          onRemove={c.phase === 'cash' ? s.trayRemove : s.changeRemove}
          confirmLabel={c.phase === 'cash' ? 'Pay' : 'Check change'}
          onConfirm={c.phase === 'cash' ? s.payCash : s.confirmChange}
        />
      )}
      {c.phase === 'card' && <Keypad total={total} onPay={s.payCard} />}
      {c.phase === 'receipt' && c.receipt && (
        <group>
          <Label position={[-0.37, 0.15, 0]} size={0.03}>{`Receipt ${c.receipt.number}: paid ₹${c.receipt.paid} by ${c.receipt.method.toUpperCase()}, change ₹${c.receipt.change}`}</Label>
          {c.receipt.lines.slice(0, 5).map((l, i) => <Label key={l.productId} position={[-0.37, 0.1 - i * 0.035, 0]} size={0.025}>{`${l.name} ×${l.qty}  ₹${l.subtotal}`}</Label>)}
          <Button3D label="Finish" onPress={s.finishShop} position={[0, -0.22, 0]} width={0.3} color="#2e7d32" />
        </group>
      )}
    </Panel3D>
  )
}

function MoneyPad({ title, counts, tray, onAdd, onRemove, confirmLabel, onConfirm }: {
  title: string
  counts?: Partial<Record<number, number>>
  tray: Partial<Record<number, number>>
  onAdd: (d: (typeof DENOMINATIONS)[number]) => void
  onRemove: (d: (typeof DENOMINATIONS)[number]) => void
  confirmLabel: string
  onConfirm: () => void
}) {
  return (
    <group>
      <Label position={[-0.37, 0.16, 0]} size={0.028}>{title}</Label>
      {DENOMINATIONS.map((d, i) => (
        <group key={d} position={[-0.3 + (i % 5) * 0.15, 0.06 - Math.floor(i / 5) * 0.13, 0.01]}>
          <Money3D value={d} onPress={() => onAdd(d)} count={counts ? (counts[d] ?? 0) - (tray[d] ?? 0) : undefined} />
          {(tray[d] ?? 0) > 0 && <Button3D label={`-${tray[d]}`} onPress={() => onRemove(d)} width={0.06} height={0.03} color="#757575" position={[0.05, 0.045, 0]} />}
        </group>
      ))}
      <Button3D label={confirmLabel} onPress={onConfirm} position={[0, -0.25, 0]} width={0.3} color="#2e7d32" />
    </group>
  )
}

function Keypad({ total, onPay }: { total: number; onPay: (n: number) => void }) {
  const [value, setValue] = useState('')
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']
  return (
    <group>
      <Label position={[-0.37, 0.16, 0]} size={0.03}>{`Type the bill amount (₹${total}): ₹${value || '—'}`}</Label>
      {keys.map((k, i) => (
        <Button3D key={k} label={k} width={0.1} height={0.06} position={[-0.12 + (i % 3) * 0.12, 0.08 - Math.floor(i / 3) * 0.075, 0]}
          color={k === 'OK' ? '#2e7d32' : k === 'C' ? '#757575' : '#1e88e5'}
          onPress={() => {
            if (k === 'C') setValue('')
            else if (k === 'OK') { onPay(Number(value)); setValue('') }
            else if (value.length < 5) setValue(value + k)
          }} />
      ))}
    </group>
  )
}

/** Result shown in VR after finishing, so the child never has to take the headset off. */
export function VRResultPanel() {
  const s = useSession()
  const r = s.lastResult
  if (s.screen !== 'complete' || !r) return null
  const v = viewFor('checkout')
  return (
    <Panel3D width={0.8} height={0.5} position={[v.pos[0], 1.5, v.pos[2] - 1.3]} color="#fff8e1">
      <Text position={[0, 0.18, 0]} fontSize={0.05} color="#e64a19" fontWeight={800}>{r.title}</Text>
      <Text position={[0, 0.11, 0]} fontSize={0.04} color="#f9a825">{'★'.repeat(r.stars) + '☆'.repeat(3 - r.stars)}</Text>
      {r.lines.slice(0, 3).map((l, i) => <Text key={i} position={[0, 0.05 - i * 0.04, 0]} fontSize={0.025} color="#37474f" maxWidth={0.72} anchorX="center">{l}</Text>)}
      <Text position={[0, -0.09, 0]} fontSize={0.03} color="#2e7d32">{`+${r.award.coins} coins`}</Text>
      <Button3D label="Shop again" position={[-0.17, -0.18, 0]} width={0.28} onPress={() => s.startShop(s.challenge?.mode ?? 'free', s.level)} />
      <Button3D label="Exit VR" position={[0.17, -0.18, 0]} width={0.28} color="#455a64" onPress={() => void xrStore.getState().session?.end()} />
    </Panel3D>
  )
}
