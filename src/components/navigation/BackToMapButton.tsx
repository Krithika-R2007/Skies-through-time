import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RoundedButton } from '../shared/RoundedButton'
import { useKeys } from '../../hooks/useKeys'

// Returns the user to the celestial map (Esc works too). The map restores its saved
// camera view on mount.
export function BackToMapButton() {
  const navigate = useNavigate()
  useKeys({ Escape: () => navigate('/') })
  return (
    <RoundedButton variant="secondary" size="sm" onClick={() => navigate('/')} title="Back to map (Esc)">
      <ArrowLeft className="h-5 w-5" />
      Map
    </RoundedButton>
  )
}
