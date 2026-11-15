import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMapStore } from '../../store/mapStore'

export function NavigationTrigger() {
  const navigate = useNavigate()
  const pending = useMapStore((s) => s.pendingNavigation)
  const navReady = useMapStore((s) => s.navReady)

  useEffect(() => {
    if (pending && navReady) {
      navigate(pending)
      useMapStore.getState().clearPendingNavigation()
    }
  }, [pending, navReady, navigate])

  return null
}
