import { Sparkles, Star, Globe, Moon, Snowflake, Mountain, Flame, Orbit } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useFilterStore } from '../../store/filterStore'
import { OBJECT_TYPES, OBJECT_TYPE_LABELS } from '../../data/models'
import type { ObjectType } from '../../data/models'
import { cn } from '../../utils/cn'

const ICONS: Record<ObjectType, LucideIcon> = {
  star: Star,
  planet: Globe,
  dwarfPlanet: Moon,
  comet: Snowflake,
  asteroid: Mountain,
  brownDwarf: Flame,
  galaxy: Orbit,
}

interface FilterButtonProps {
  active: boolean
  icon: LucideIcon
  label: string
  expanded: boolean
  onClick: () => void
}

function FilterButton({ active, icon: Icon, label, expanded, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300',
        expanded ? '' : 'justify-center',
        active
          ? 'bg-cyan/15 text-cyan'
          : 'text-lavender/65 hover:bg-white/5 hover:text-soft-white',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={cn('font-heading whitespace-nowrap text-xs tracking-wide transition-all duration-300', expanded ? 'opacity-100' : 'pointer-events-none w-0 overflow-hidden opacity-0')}>
        {label}
      </span>
    </button>
  )
}

export function TypeFilters({ expanded }: { expanded: boolean }) {
  const activeTypes = useFilterStore((s) => s.activeTypes)
  const toggleType = useFilterStore((s) => s.toggleType)
  const setAll = useFilterStore((s) => s.setAll)
  const isAll = activeTypes.length === 0

  return (
    <nav className="flex flex-col gap-1.5 pl-2">
      <FilterButton active={isAll} icon={Sparkles} label="All Objects" expanded={expanded} onClick={setAll} />
      {OBJECT_TYPES.map((type) => (
        <FilterButton
          key={type}
          active={activeTypes.includes(type)}
          icon={ICONS[type]}
          label={OBJECT_TYPE_LABELS[type]}
          expanded={expanded}
          onClick={() => toggleType(type)}
        />
      ))}
    </nav>
  )
}
