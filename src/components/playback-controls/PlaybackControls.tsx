import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

const ICON_BTN =
  'flex h-10 w-10 items-center justify-center rounded-xl text-lavender/80 transition-colors hover:bg-white/10 hover:text-soft-white disabled:pointer-events-none disabled:opacity-30'

export function PlaybackControls({
  isPlaying,
  currentIndex,
  count,
  onPlay,
  onPause,
  onRestart,
  onPrev,
  onNext,
  onSelect,
}: {
  isPlaying: boolean
  currentIndex: number
  count: number
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onPrev: () => void
  onNext: () => void
  onSelect: (index: number) => void
}) {
  const progress = count <= 1 ? 0 : (currentIndex / (count - 1)) * 100

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md sm:flex-nowrap">
      <button onClick={onRestart} disabled={count === 0} aria-label="Restart" className={ICON_BTN}>
        <RotateCcw className="h-[1.1rem] w-[1.1rem]" />
      </button>
      <button onClick={onPrev} disabled={count <= 1 || currentIndex === 0} aria-label="Previous" className={ICON_BTN}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={count === 0}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan text-void transition-colors hover:bg-soft-white disabled:pointer-events-none disabled:opacity-30"
      >
        {isPlaying ? <Pause className="h-[1.1rem] w-[1.1rem]" /> : <Play className="h-[1.1rem] w-[1.1rem]" />}
      </button>
      <button onClick={onNext} disabled={count <= 1 || currentIndex === count - 1} aria-label="Next" className={ICON_BTN}>
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="mx-2 h-1 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <span className="font-heading text-sm text-lavender/70">
        {count === 0 ? '\u2014' : `${currentIndex + 1} / ${count}`}
      </span>

      {count > 0 && (
        <select
          value={currentIndex}
          onChange={(e) => onSelect(Number(e.target.value))}
          aria-label="Select observation"
          className="ml-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 font-heading text-sm text-lavender focus:border-cyan/40 focus:outline-none"
        >
          {Array.from({ length: count }, (_, i) => (
            <option key={i} value={i} className="bg-midnight-700 text-soft-white">
              {i + 1}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
