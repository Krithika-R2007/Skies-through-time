import type { FrameNote, NoteTone } from '../../utils/frameNotes'
import { cn } from '../../utils/cn'

// The information that explains a frame lives beside the image, never on top of it, so the
// picture stays clear. Each note is a short labelled passage with a thin accent bar:
// amber for image problems, green for a clean frame, cyan for context, lavender for
// illustrative (demonstration) text.

const BAR: Record<NoteTone, string> = {
  info: 'border-cyan/45',
  warn: 'border-amber-300/80',
  good: 'border-emerald-300/50',
  demo: 'border-lavender/45',
}
const LABEL: Record<NoteTone, string> = {
  info: 'text-cyan/80',
  warn: 'text-amber-200',
  good: 'text-emerald-200/90',
  demo: 'text-lavender/80',
}

export function NoteList({ notes, columns = false }: { notes: FrameNote[]; columns?: boolean }) {
  return (
    <ul className={columns ? 'grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
      {notes.map((n) => (
        <li key={n.id} className={cn('border-l-2 pl-3.5', BAR[n.tone])}>
          <p className={cn('font-heading text-[0.7rem] uppercase tracking-[0.2em]', LABEL[n.tone])}>{n.label}</p>
          <p
            className={cn(
              'mt-1 leading-snug',
              n.strong
                ? 'font-heading text-[1.1rem] text-soft-white'
                : 'font-body text-[0.97rem] text-lavender/85',
            )}
          >
            {n.text}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function FrameInfoPanel({
  kicker,
  title,
  subtitle,
  notes,
  emptyText,
  footer,
  columns = false,
  className,
}: {
  kicker: string
  title?: string
  subtitle?: string
  notes: FrameNote[]
  emptyText?: string
  footer?: string
  columns?: boolean
  className?: string
}) {
  return (
    <aside className={cn('rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-md', className)}>
      <p className="font-heading text-xs uppercase tracking-[0.25em] text-lavender/55">{kicker}</p>
      {title && <p className="mt-1.5 font-display text-2xl leading-tight text-soft-white">{title}</p>}
      {subtitle && <p className="mt-0.5 font-heading text-sm text-cyan">{subtitle}</p>}

      <div className={cn(title || subtitle ? 'mt-5' : 'mt-4')}>
        {notes.length > 0 ? (
          <NoteList notes={notes} columns={columns} />
        ) : (
          emptyText && <p className="font-body text-[0.97rem] leading-snug text-lavender/60">{emptyText}</p>
        )}
      </div>

      {footer && <p className="mt-5 border-t border-white/10 pt-3 font-body text-xs text-lavender/45">{footer}</p>}
    </aside>
  )
}
