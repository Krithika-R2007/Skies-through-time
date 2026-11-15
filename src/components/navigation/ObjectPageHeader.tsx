import { BackToMapButton } from './BackToMapButton'

// Top-left of every object page: just the back-to-map button.
export function ObjectPageHeader() {
  return (
    <div className="absolute left-5 top-5 z-30">
      <BackToMapButton />
    </div>
  )
}
