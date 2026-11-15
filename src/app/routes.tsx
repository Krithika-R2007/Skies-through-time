import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'

const CosmicMapPage = lazy(() => import('../pages/CosmicMapPage'))
const ObjectExplorerPage = lazy(() => import('../pages/ObjectExplorerPage'))
const ObservationPlaybackPage = lazy(() => import('../pages/ObservationPlaybackPage'))
const ObjectStoryPage = lazy(() => import('../pages/ObjectStoryPage'))

export function AppRoutes({ location }: { location: Location }) {
  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading">
          <div className="h-10 w-10 animate-pulse rounded-full border border-cyan/40" />
        </div>
      }
    >
      <Routes location={location}>
        <Route path="/" element={<CosmicMapPage />} />
        <Route path="/explore/:objectId" element={<ObjectExplorerPage />} />
        <Route path="/play/:objectId" element={<ObservationPlaybackPage />} />
        <Route path="/story/:objectId" element={<ObjectStoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
