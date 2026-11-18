/**
 * Native looks inside the phone apps, from the shared Kolam kits (loaded in index.html):
 * - Android app (Capacitor shell, or ?app=android): Material Design 3 app bar + navigation bar (KolamM3).
 * - iPhone app (MySupermarket-iOS shell, or ?app=ios): Apple HIG navigation bar + tab bar (KolamIOS).
 * In a browser both kits stay off and the website keeps its own look.
 *
 * The app has no URL routes (screens live in the session store), so the bars follow useSession.screen:
 * - hub screens (Shop, Rewards, Progress, Settings) get the native top bar and tab bar;
 * - menu sub-screens get the native top bar with Back, no tab bar;
 * - the 3D store, quizzes, results and the welcome screen stay full-screen with their own controls.
 */
import { useProgress } from './store/progressStore'
import { useSession, type Screen } from './store/sessionStore'

type Kit = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    KolamM3?: Kit
    KolamIOS?: Kit
  }
}

const TABS: Partial<Record<Screen, string>> = { modes: 'Shop', rewards: 'Rewards', progress: 'My progress', settings: 'Settings' }
const SUBS: Partial<Record<Screen, { title: string; back: () => Screen; backLabel: string }>> = {
  levels: { title: 'Learning Path', back: () => 'modes', backLabel: 'Shop' },
  parent: { title: 'Parent dashboard', back: () => (useProgress.getState().profile ? 'modes' : 'welcome'), backLabel: 'Back' },
  ar: { title: 'AR Mode', back: () => 'modes', backLabel: 'Shop' },
  avatar: { title: 'Choose your shopper', back: () => 'welcome', backLabel: 'Back' },
  age: { title: 'How old are you?', back: () => 'avatar', backLabel: 'Back' },
}
const goto = (s: Screen) => useSession.getState().goto(s)
const svg = (inner: string) =>
  `<svg class="ios-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`
const CART = svg('<path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>')
const CHART = svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')

let mode: 'android' | 'ios' | null = null
let m3: Kit | null = null

export function initNative() {
  const ios = window.KolamIOS?.init({
    appName: 'My Supermarket',
    uaTokens: ['MySupermarket-iOS'],
    tint: { light: '#C2410C', dark: '#FF9A6B' },
    tabs: [
      { id: 'modes', label: 'Shop', icon: CART, href: '#' },
      { id: 'rewards', label: 'Rewards', icon: 'star', href: '#' },
      { id: 'progress', label: 'Progress', icon: CHART, href: '#' },
      { id: 'settings', label: 'Settings', icon: 'gearshape', href: '#' },
    ],
    currentTab: 'modes',
    onTabSelect: (id: Screen) => {
      goto(id)
      return false
    },
    swipeBack: false,
  })
  if (ios) {
    mode = 'ios'
    document.documentElement.classList.remove('k-android', 'k-app')
  } else if (window.KolamM3?.isAndroid) {
    mode = 'android'
    const screen = () => useSession.getState().screen
    m3 = window.KolamM3.init({
      primary: '#FF7A45',
      title: 'My Supermarket',
      destinations: [
        { id: 'modes', label: 'Shop', icon: 'shopping_cart', onSelect: () => goto('modes') },
        { id: 'rewards', label: 'Rewards', icon: 'emoji_events', onSelect: () => goto('rewards') },
        { id: 'progress', label: 'Progress', icon: 'insights', onSelect: () => goto('progress') },
        { id: 'settings', label: 'Settings', icon: 'settings', onSelect: () => goto('settings') },
      ],
      isRoot: () => ['welcome', 'modes'].includes(screen()),
      // Back (arrow or the hardware button): sub-screens go to their parent, other tabs go to Shop,
      // the store, quizzes and results keep their own exits, and Shop/Welcome leave the app.
      onBack: () => {
        const s = screen()
        const sub = SUBS[s]
        if (sub) {
          goto(sub.back())
          return true
        }
        if (TABS[s] && s !== 'modes') {
          goto('modes')
          return true
        }
        return !['welcome', 'modes'].includes(s)
      },
    })
  }
  if (!mode) return
  let last: Screen | null = null
  let lastName: string | undefined
  const sync = (s: Screen) => {
    const name = useProgress.getState().profile?.nickname
    if (s === last && name === lastName) return
    const moved = s !== last
    last = s
    lastName = name
    const html = document.documentElement
    const tab = TABS[s]
    const sub = SUBS[s]
    html.classList.toggle('vs-tab', !!tab)
    html.classList.toggle('vs-sub', !!sub)
    html.classList.toggle('vs-immersive', !tab && !sub)
    if (!tab && !sub) return
    const title = s === 'modes' ? (name ? `Hi ${name}!` : 'Shop') : (tab ?? sub!.title)
    if (mode === 'ios') {
      const K = window.KolamIOS!
      if (tab) {
        K.tabBar.select(s)
        K.navBar.set({ title, large: true })
      } else K.navBar.set({ title, back: { label: sub!.backLabel, onClick: () => goto(sub!.back()) } })
      setTimeout(() => K.enhance?.(document.getElementById('root')))
    } else {
      setTimeout(() => {
        m3!.setTitle(title)
        if (tab) m3!.setActive(s)
        m3!.setBack(!!sub)
      })
    }
    if (moved) window.scrollTo({ top: 0 })
  }
  sync(useSession.getState().screen)
  useSession.subscribe((st) => sync(st.screen))
  useProgress.subscribe(() => sync(useSession.getState().screen)) // the player's name arrives after hydration
}
