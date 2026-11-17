import { useEffect } from 'react'
import { useProgress } from './store/progressStore'
import { useSession } from './store/sessionStore'
import { AchievementToasts } from './ui/components/Kit'
import { ARScreen } from './ui/screens/ARScreen'
import { CompleteOverlay, ParentDashboard, ProgressScreen, RewardsScreen, SettingsScreen } from './ui/screens/Dashboards'
import { AgeScreen, AvatarScreen, LevelsScreen, ModesScreen, WelcomeScreen } from './ui/screens/Menus'
import { QuizScreen } from './ui/screens/QuizScreen'
import { StoreScreen } from './ui/screens/StoreScreen'

/** Counts learning time while a game screen is open and the tab is visible. */
function useLearningClock() {
  const screen = useSession((s) => s.screen)
  useEffect(() => {
    if (!['store', 'quiz', 'ar'].includes(screen)) return
    let last = Date.now()
    const t = setInterval(() => {
      const now = Date.now()
      if (document.visibilityState === 'visible') useProgress.getState().addTime(now - last)
      last = now
    }, 5000)
    return () => {
      if (document.visibilityState === 'visible') useProgress.getState().addTime(Date.now() - last)
      clearInterval(t)
    }
  }, [screen])
}

export function App() {
  const hydrated = useProgress((s) => s.hydrated)
  const screen = useSession((s) => s.screen)
  const lastResult = useSession((s) => s.lastResult)
  useLearningClock()

  if (!hydrated) {
    return <div className="grid h-full place-items-center text-2xl font-bold">Loading…</div>
  }

  // The 3D store stays mounted behind the results card so a VR session is never cut off.
  const storeMounted = screen === 'store' || (screen === 'complete' && lastResult?.kind === 'shop')

  return (
    <>
      {storeMounted && <StoreScreen />}
      {screen === 'welcome' && <WelcomeScreen />}
      {screen === 'avatar' && <AvatarScreen />}
      {screen === 'age' && <AgeScreen />}
      {screen === 'modes' && <ModesScreen />}
      {screen === 'levels' && <LevelsScreen />}
      {screen === 'quiz' && <QuizScreen />}
      {screen === 'complete' && <CompleteOverlay />}
      {screen === 'rewards' && <RewardsScreen />}
      {screen === 'progress' && <ProgressScreen />}
      {screen === 'parent' && <ParentDashboard />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'ar' && <ARScreen />}
      <AchievementToasts />
    </>
  )
}
