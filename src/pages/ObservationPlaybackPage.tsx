import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Minus, Plus } from 'lucide-react'
import { PageTransition } from '../components/shared/PageTransition'
import { ObjectPageHeader } from '../components/navigation/ObjectPageHeader'
import { ObservationImage } from '../components/observation-panel/ObservationImage'
import { PlaybackControls } from '../components/playback-controls/PlaybackControls'
import { ComparisonViewer, compareFit } from '../components/comparison/ComparisonViewer'
import { AnnotatedComparison } from '../components/comparison/AnnotatedComparison'
import { FrameInfoPanel } from '../components/playback/FrameInfoPanel'
import { RoundedButton } from '../components/shared/RoundedButton'
import { useDataProvider } from '../data/providers/DataContext'
import { useObjectObservations } from '../hooks/useObjectObservations'
import { useLiveAnnotations } from '../hooks/useLiveAnnotations'
import { DiscoverPanel } from '../components/discovery/DiscoverPanel'
import { DiffPanel } from '../components/discovery/DiffPanel'
import { DataSourceBadge } from '../components/observation-panel/LiveInsights'
import { displayedPlaceholder, formatObservationDate } from '../utils/observation'
import { comparisonNotes, frameNotes, setNotes } from '../utils/frameNotes'
import { useKeys } from '../hooks/useKeys'
import { playSound } from '../utils/sound'

type Mode = 'playback' | 'compare' | 'annotated' | 'discover'

// Playback flips quickly so a run of frames reads like a short film. The annotated
// sequence is slower because each step carries text to read.
const PLAYBACK_MS = 800
const ANNOTATED_MS = 1500

// Width cap that keeps an image of the given width/height ratio fully on screen. The
// reserve is the height used by the tabs, the name row and the controls.
const fit = (ratio: number, reserve = '16rem') => ({
  maxWidth: `min(100%, max(22rem, calc((100vh - ${reserve}) * ${ratio})))`,
})
const STEP_BTN =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-lavender transition-colors hover:bg-white/10 hover:text-soft-white disabled:pointer-events-none disabled:opacity-30'
const TEXT_BTN =
  'rounded-xl border border-white/15 px-4 py-2 font-heading text-sm text-lavender transition-colors hover:bg-white/10 hover:text-soft-white disabled:pointer-events-none disabled:opacity-30'

export default function ObservationPlaybackPage() {
  const { objectId } = useParams()
  const navigate = useNavigate()
  const provider = useDataProvider()
  const obj = objectId ? provider.getObjectById(objectId) : undefined
  const info = useObjectObservations(obj)
  const observations = info.observations
  const isLive = info.mode === 'live'
  // Discover and the diff tool need real SPHEREx cutouts, not the NEOWISE fallback frames.
  const canDiscover = isLive && observations.filter((o) => o.live && o.live.kind !== 'unwise').length >= 2
  const bands = obj ? provider.getSpectralBands(obj.id) : []
  const demoComparisons = obj ? provider.getComparisons(obj.id) : []
  // Demonstration objects keep their illustrative change sequence. Live objects get one
  // measured step per consecutive pair of NEOWISE images, drawn on the later real image.
  const liveAnn = useLiveAnnotations(obj, observations, isLive)
  const annLive = isLive
  const comparisons = info.mode === 'demo' ? demoComparisons : liveAnn.comparisons
  const selectedBand = bands[0]?.id ?? ''
  const total = observations.length

  const [mode, setMode] = useState<Mode>('playback')
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [compareCount, setCompareCount] = useState(Math.min(2, total))
  const [compareStart, setCompareStart] = useState(0)
  const [annotatedIndex, setAnnotatedIndex] = useState(0)
  const [annotatedPlaying, setAnnotatedPlaying] = useState(false)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => setFinished(false), [index, mode])

  // Live frames are fetched from NASA on demand, so load them all up front: playback then
  // flips between frames without waiting on the network.
  useEffect(() => {
    if (!isLive) return
    const imgs = observations.map((o) => { const im = new Image(); im.src = o.live?.imageSrc ?? ''; return im })
    return () => { imgs.forEach((im) => { im.src = '' }) }
  }, [isLive, observations])
  useEffect(() => {
    setIndex(0)
    setCompareStart(0)
    setCompareCount(Math.min(2, observations.length))
    setAnnotatedIndex(0)
    setMode((m) => (m === 'discover' && !canDiscover) ? 'playback' : m)
  }, [info.mode, obj?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Each frame is held for FRAME_DURATION; after the last frame the first pass ends and
  // the annotated stage is offered.
  useEffect(() => {
    if (mode === 'playback' && isPlaying && total > 0) {
      timerRef.current = window.setTimeout(() => {
        if (index + 1 >= total) {
          setIsPlaying(false)
          setFinished(true)
        } else {
          setIndex(index + 1)
        }
      }, PLAYBACK_MS)
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [mode, isPlaying, index, total])

  useEffect(() => {
    if (mode === 'annotated' && annotatedPlaying && comparisons.length > 1) {
      timerRef.current = window.setTimeout(
        () => setAnnotatedIndex((i) => (i + 1 >= comparisons.length ? 0 : i + 1)),
        ANNOTATED_MS,
      )
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [mode, annotatedPlaying, annotatedIndex, comparisons.length])

  // A soft tick on each annotated step. Fast playback stays silent: a tick per frame
  // would turn into a rattle.
  useEffect(() => {
    if (annotatedPlaying) playSound('tick')
  }, [annotatedIndex, annotatedPlaying])

  const startPlayback = () => {
    if (index >= total - 1) setIndex(0)
    setFinished(false)
    setIsPlaying(true)
  }

  useKeys({
    ' ': (e) => {
      e.preventDefault()
      if (mode === 'playback') (isPlaying ? setIsPlaying(false) : startPlayback())
      else if (mode === 'annotated') setAnnotatedPlaying((p) => !p)
    },
    ArrowRight: () => {
      if (mode === 'playback') { setIndex((i) => Math.min(total - 1, i + 1)); setIsPlaying(false) }
      else if (mode === 'annotated') { setAnnotatedIndex((i) => Math.min(comparisons.length - 1, i + 1)); setAnnotatedPlaying(false) }
    },
    ArrowLeft: () => {
      if (mode === 'playback') { setIndex((i) => Math.max(0, i - 1)); setIsPlaying(false) }
      else if (mode === 'annotated') { setAnnotatedIndex((i) => Math.max(0, i - 1)); setAnnotatedPlaying(false) }
    },
  })

  if (!obj) {
    return (
      <PageTransition>
        <div className="flex h-full items-center justify-center">
          <p className="font-heading text-lavender/60">Object not found.</p>
        </div>
      </PageTransition>
    )
  }

  if (info.mode === 'loading') {
    return (
      <PageTransition>
        <div className="relative h-full w-full">
          <ObjectPageHeader />
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center" role="status">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan/20 border-t-cyan" />
            <h1 className="font-display text-2xl text-soft-white">{obj.name}</h1>
            <p className="font-body text-base text-lavender/70">Fetching real images from NASA{'\u2026'}</p>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (total === 0) {
    return (
      <PageTransition>
        <div className="relative h-full w-full">
          <ObjectPageHeader />
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <h1 className="font-display text-3xl text-soft-white">{obj.name}</h1>
            <p className="mt-4 font-body text-base text-lavender/70">No observations available for playback yet.</p>
            <RoundedButton variant="secondary" size="md" className="mt-6" onClick={() => navigate(`/explore/${obj.id}`)}>
              Back to Object
            </RoundedButton>
          </div>
        </div>
      </PageTransition>
    )
  }

  const currentObs = observations[index]
  const currentComparison = comparisons[annotatedIndex]

  const maxStart = Math.max(0, total - compareCount)
  const start = Math.min(compareStart, maxStart)
  const shown = observations.slice(start, start + compareCount)

  // Notes shown in the info panel: why this frame may look different, and whether the
  // image had problems.
  const playLive = !!currentObs.live
  const demoChange = playLive ? undefined : demoComparisons.find((c) => c.secondObservationId === currentObs.id)
  const playNotes = frameNotes(currentObs, index > 0 ? observations[index - 1] : undefined, demoChange)
  const compareNotes = setNotes(shown)
  const annFrom = currentComparison ? observations.find((o) => o.id === currentComparison.firstObservationId) : undefined
  const annTo = currentComparison ? observations.find((o) => o.id === currentComparison.secondObservationId) : undefined

  const canCompare = total >= 2
  const canAnnotate = comparisons.length > 0
  // While measurements load the tab stays clickable and shows a spinner.
  const annotatedEnabled = canAnnotate || (annLive && liveAnn.loading)
  const modes = ([
    { id: 'playback', label: 'Playback', enabled: true },
    { id: 'compare', label: 'Compare', enabled: canCompare },
    { id: 'annotated', label: 'Annotated', enabled: annotatedEnabled },
    { id: 'discover', label: 'Discover', enabled: canDiscover },
  ] as { id: Mode; label: string; enabled: boolean }[]).filter((m) => m.id !== 'discover' || canDiscover)

  const switchMode = (m: Mode) => {
    setMode(m)
    setIsPlaying(false)
    setAnnotatedPlaying(false)
  }

  return (
    <PageTransition>
      <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
        <ObjectPageHeader />

        <div className="absolute right-5 top-5 z-30">
          <RoundedButton variant="secondary" size="sm" onClick={() => navigate(`/story/${obj.id}`)}>
            <BookOpen className="h-4 w-4" />
            Read About It
          </RoundedButton>
        </div>

        <div className="mx-auto flex min-h-full w-full max-w-[84rem] flex-col items-center justify-center px-5 pb-16 pt-20 sm:px-10 md:pt-28">
          {/* Mode switch */}
          <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 backdrop-blur-md md:absolute md:left-1/2 md:top-5 md:z-30 md:mb-0 md:-translate-x-1/2">
            {modes.map((m) => (
              <button
                key={m.id}
                disabled={!m.enabled}
                onClick={() => switchMode(m.id)}
                className={`rounded-xl px-4 py-2 font-heading text-sm tracking-wide transition-colors duration-200 disabled:pointer-events-none disabled:opacity-30 sm:px-6 sm:text-base ${
                  mode === m.id ? 'bg-cyan text-void' : 'text-lavender/75 hover:text-soft-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <h1 className="font-display text-center text-2xl text-soft-white sm:text-3xl">{obj.name}</h1>
            <DataSourceBadge info={info} />
          </div>

          {mode === 'playback' && (
            <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center lg:gap-6">
              <div className="w-full min-w-0 lg:flex-1" style={fit(playLive ? 1 : 1.6)}>
              {/* Frames swap instantly so every change is seen as a sharp difference */}
              <ObservationImage
                placeholder={displayedPlaceholder(currentObs, selectedBand, bands)}
                src={currentObs.live?.imageSrc}
                aspect={playLive ? 'aspect-square' : 'aspect-[16/10]'}
                instant
              />
              <div className="mt-3 w-full">
                <PlaybackControls
                  isPlaying={isPlaying}
                  currentIndex={index}
                  count={total}
                  onPlay={startPlayback}
                  onPause={() => setIsPlaying(false)}
                  onRestart={() => { setIndex(0); setIsPlaying(false) }}
                  onPrev={() => { setIndex((i) => Math.max(0, i - 1)); setIsPlaying(false) }}
                  onNext={() => { setIndex((i) => Math.min(total - 1, i + 1)); setIsPlaying(false) }}
                  onSelect={(i) => { setIndex(i); setIsPlaying(false) }}
                />
              </div>
              {finished && !isPlaying && canAnnotate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 flex justify-center"
                >
                  <RoundedButton
                    variant="primary"
                    size="md"
                    onClick={() => {
                      switchMode('annotated')
                      setAnnotatedIndex(0)
                      setAnnotatedPlaying(true)
                    }}
                  >
                    See what changed
                    <ArrowRight className="h-4 w-4" />
                  </RoundedButton>
                </motion.div>
              )}
              </div>

              <FrameInfoPanel
                className="w-full lg:w-[clamp(17rem,24vw,23rem)] lg:shrink-0"
                kicker={`Frame ${index + 1} of ${total}`}
                title={formatObservationDate(currentObs.observationDate)}
                subtitle={currentObs.live?.bandpassId ?? (playLive ? undefined : 'Demonstration data')}
                notes={playNotes}
                emptyText={index === 0 ? 'First frame of the series, so there is nothing earlier to compare it with.' : 'Nothing noteworthy about this frame.'}
              />
            </div>
          )}

          {mode === 'compare' && canCompare && (
            <div className="w-full max-w-6xl">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-2.5 py-1.5 backdrop-blur-md">
                  <button
                    aria-label="Show fewer observations"
                    className={STEP_BTN}
                    disabled={compareCount <= 2}
                    onClick={() => setCompareCount((c) => Math.max(2, c - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[7.5rem] text-center font-heading text-sm text-soft-white">
                    Showing {shown.length} of {total}
                  </span>
                  <button
                    aria-label="Show more observations"
                    className={STEP_BTN}
                    disabled={compareCount >= total}
                    onClick={() => setCompareCount((c) => Math.min(total, c + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button className={TEXT_BTN} disabled={compareCount >= total} onClick={() => setCompareCount(total)}>
                  Show all
                </button>
                {compareCount < total && (
                  <div className="flex items-center gap-2">
                    <button className={TEXT_BTN} disabled={start <= 0} onClick={() => setCompareStart(Math.max(0, start - 1))}>
                      Earlier
                    </button>
                    <button className={TEXT_BTN} disabled={start >= maxStart} onClick={() => setCompareStart(Math.min(maxStart, start + 1))}>
                      Later
                    </button>
                  </div>
                )}
              </div>
              <div className="mx-auto w-full" style={compareFit(shown.length, shown.some((o) => o.live))}>
                <ComparisonViewer observations={shown} bands={bands} selectedBandId={selectedBand} />
              </div>
              <FrameInfoPanel className="mt-5" kicker="Across these frames" notes={compareNotes} columns />
              {canDiscover && shown.length >= 2 && <DiffPanel a={shown[0]} b={shown[shown.length - 1]} />}
            </div>
          )}

          {mode === 'discover' && canDiscover && <DiscoverPanel obj={obj} />}

          {mode === 'annotated' && !currentComparison && (
            <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
              {liveAnn.loading ? (
                <>
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan/20 border-t-cyan" />
                  <p className="font-heading text-sm text-lavender/70">Measuring what changed between the NASA images{'\u2026'}</p>
                </>
              ) : (
                <p className="font-body text-sm text-amber-300/90">{liveAnn.error || 'No annotated changes are available for this object.'}</p>
              )}
            </div>
          )}

          {mode === 'annotated' && currentComparison && (
            <div className="w-full max-w-6xl">
              <div
                className="mx-auto w-full"
                style={compareFit(currentComparison.isDemoData || !currentComparison.diffImageSrc ? 2 : 3, !currentComparison.isDemoData, '22rem')}
              >
              <AnnotatedComparison
                before={annFrom ?? observations[0]}
                after={annTo ?? observations[Math.min(1, observations.length - 1)]}
                comparison={currentComparison}
                bands={bands}
                selectedBandId={selectedBand}
              />
              <div className="mt-3 w-full">
                <PlaybackControls
                  isPlaying={annotatedPlaying}
                  currentIndex={annotatedIndex}
                  count={comparisons.length}
                  onPlay={() => setAnnotatedPlaying(true)}
                  onPause={() => setAnnotatedPlaying(false)}
                  onRestart={() => { setAnnotatedIndex(0); setAnnotatedPlaying(false) }}
                  onPrev={() => { setAnnotatedIndex((i) => Math.max(0, i - 1)); setAnnotatedPlaying(false) }}
                  onNext={() => { setAnnotatedIndex((i) => Math.min(comparisons.length - 1, i + 1)); setAnnotatedPlaying(false) }}
                  onSelect={(i) => { setAnnotatedIndex(i); setAnnotatedPlaying(false) }}
                />
              </div>
              </div>

              <FrameInfoPanel
                className="mt-5"
                columns
                kicker={`Step ${annotatedIndex + 1} of ${comparisons.length}`}
                title={`${annFrom?.observationEpoch ?? ''} \u2192 ${annTo?.observationEpoch ?? ''}`}
                notes={comparisonNotes(currentComparison)}
                footer={
                  currentComparison.isDemoData
                    ? 'The box and arrow are illustrative annotations, not measurements.'
                    : 'Changes are measured by comparing each star\u2019s position and brightness in the two NASA NEOWISE images. Saturated stars are skipped.'
                }
              />
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
