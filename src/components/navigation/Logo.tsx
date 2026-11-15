// Text-only wordmark in the display typeface. Used on the map only (top of the sidebar).
// Collapsed, it shortens to initials so it still fits the narrow panel.
export function Logo({ expanded = true }: { expanded?: boolean }) {
  return (
    <div className="py-5 pl-4 pr-[14%]">
      <span
        className="font-display block whitespace-nowrap bg-gradient-to-r from-soft-white via-cyan to-lavender bg-clip-text text-transparent"
        style={{ fontSize: expanded ? '1rem' : '0.8rem', lineHeight: 1.1 }}
      >
        {expanded ? 'Skies Through Time' : 'STT'}
      </span>
    </div>
  )
}
