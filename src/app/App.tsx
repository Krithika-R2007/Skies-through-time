import { HashRouter, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { DataProvider } from '../data/providers/DataContext'
import { CosmicBackground } from '../components/shared/CosmicBackground'
import { FullscreenControl } from '../components/navigation/FullscreenControl'
import { SoundToggle } from '../components/navigation/SoundToggle'
import { BackendStatus } from '../components/navigation/BackendStatus'
import { AppRoutes } from './routes'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence>
      <AppRoutes location={location} key={location.pathname} />
    </AnimatePresence>
  )
}

// The background lives outside the page tree so it never unmounts. On every page except
// the map it softens its small stars so the main content takes the focus.
function Background() {
  const { pathname } = useLocation()
  return <CosmicBackground dimmed={pathname !== '/'} />
}

export default function App() {
  return (
    <DataProvider>
      <MotionConfig reducedMotion="user">
        <HashRouter>
          <Background />
          <AnimatedRoutes />
          <SoundToggle />
          <BackendStatus />
          <FullscreenControl />
        </HashRouter>
      </MotionConfig>
    </DataProvider>
  )
}
