import { useEffect } from 'react'
import { PageTransition } from '../components/shared/PageTransition'
import { CelestialMap } from '../components/celestial-map/CelestialMap'
import { MapLabels } from '../components/celestial-map/MapLabels'
import { MapHoverCard } from '../components/celestial-map/MapHoverCard'
import { IntroTitle } from '../components/celestial-map/IntroTitle'
import { NavigationTrigger } from '../components/celestial-map/NavigationTrigger'
import { CurvedSidebar } from '../components/navigation/CurvedSidebar'
import { SearchBar } from '../components/navigation/SearchBar'
import { useMapStore } from '../store/mapStore'

export default function CosmicMapPage() {
  useEffect(() => {
    const s = useMapStore.getState()
    s.clearSelection()
    s.setHover(null)
    s.clearPendingNavigation()
    document.body.style.cursor = ''
    // The page fades in; re-measure the canvas once it has settled so clicks land where objects are drawn.
    const t = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 600)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <PageTransition flat>
      <div className="relative h-full w-full">
        <CelestialMap />
        <MapLabels />
        <MapHoverCard />
        <IntroTitle />
        <CurvedSidebar />
        <SearchBar />
        <NavigationTrigger />
      </div>
    </PageTransition>
  )
}
