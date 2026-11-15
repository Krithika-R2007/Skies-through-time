import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, BookOpen } from 'lucide-react'
import { PageTransition } from '../components/shared/PageTransition'
import { ObjectPageHeader } from '../components/navigation/ObjectPageHeader'
import { ObjectDisplay } from '../components/celestial-objects/ObjectDisplay'
import { ObservationImage } from '../components/observation-panel/ObservationImage'
import { ObservationTimeline } from '../components/observation-timeline/ObservationTimeline'
import { SpectralBandSelector } from '../components/observation-panel/SpectralBandSelector'
import { RoundedButton } from '../components/shared/RoundedButton'
import { ChannelSlider, useChannelWavelengths } from '../components/observation-panel/ChannelSlider'
import { LiveInsights } from '../components/observation-panel/LiveInsights'
import { useObjectObservations } from '../hooks/useObjectObservations'
import { channelImageUrl } from '../data/api/endpoints'
import { useDataProvider } from '../data/providers/DataContext'
import { OBJECT_TYPE_LABELS } from '../data/models'
import { displayedPlaceholder, formatObservationDate } from '../utils/observation'
import { useKeys } from '../hooks/useKeys'

// Reusable object exploration template, laid out in two columns on wide screens:
//  - left (about 70%): the large observation image with its epoch/date badge top-right,
//    the year timeline and the spectral band selector
//  - right: name and short info at the top, the animated object in the middle, and the
//    two actions at the bottom
// On narrow screens the blocks stack in reading order: info, image and timeline, object,
// actions.
export default function ObjectExplorerPage() {
  const { objectId } = useParams()
  const navigate = useNavigate()
  const provider = useDataProvider()
  const obj = objectId ? provider.getObjectById(objectId) : undefined

  const info = useObjectObservations(obj)
  const observations = info.observations
  const bands = obj ? provider.getSpectralBands(obj.id) : []

  const [obsIndex, setObsIndex] = useState(0)
  const [selectedBand, setSelectedBand] = useState(() => bands[0]?.id ?? '')
  const [channel, setChannel] = useState<number | null>(null)
  const onChannel = useCallback((c: number | null) => setChannel(c), [])
  const isLive = info.mode === 'live'
  const isLoading = info.mode === 'loading'
  // NEOWISE fallback frames have no spectral channels.
  const hasChannels = isLive && observations[obsIndex]?.live?.kind !== 'unwise'
  const wavelengthOf = useChannelWavelengths(hasChannels ? observations[obsIndex] : undefined)
  useEffect(() => {
    setObsIndex(0)
    setChannel(null)
  }, [info.mode, obj?.id])

  useKeys({
    ArrowLeft: () => setObsIndex((i) => Math.max(0, i - 1)),
    ArrowRight: () => setObsIndex((i) => Math.min(observations.length - 1, i + 1)),
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

  const currentObs = observations[obsIndex]
  const imagePlaceholder = currentObs ? displayedPlaceholder(currentObs, selectedBand, bands) : null
  const activeBand = bands.find((b) => b.id === selectedBand)
  const liveData = isLive ? currentObs?.live : undefined
  const imageSrc = liveData ? (channel !== null && hasChannels ? channelImageUrl(liveData.renderUrl, channel) : liveData.imageSrc) : undefined
  const channelUm = channel !== null && liveData ? wavelengthOf(channel).um : undefined

  return (
    <PageTransition>
      <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
        <ObjectPageHeader />

        <div className="mx-auto grid min-h-full w-full max-w-[110rem] grid-cols-1 gap-x-8 gap-y-6 px-5 pb-16 pt-20 md:grid-cols-[minmax(0,1fr)_clamp(17rem,28vw,27rem)] md:grid-rows-[auto_1fr_auto] md:px-10 md:pb-10">
          {/* Right, top: name and short info */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="order-1 md:order-none md:col-start-2 md:row-start-1"
          >
            <span className="font-heading text-xs uppercase tracking-[0.3em] text-lavender/60">
              {OBJECT_TYPE_LABELS[obj.objectType]}
            </span>
            <h1 className="font-display mt-1 text-3xl leading-tight text-soft-white sm:text-4xl">{obj.name}</h1>
            <p className="mt-3 font-body text-sm leading-relaxed text-lavender/80 sm:text-base">{obj.description}</p>
          </motion.div>

          {/* Left: image, timeline, bands. Width is capped by the screen height so the
              whole block fits without scrolling on wide screens. */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="order-2 flex flex-col justify-center md:order-none md:col-start-1 md:row-span-3 md:row-start-1"
          >
            <div
              className="mx-auto w-full"
              style={{ maxWidth: 'min(100%, max(22rem, calc((100vh - 17rem) * 1.6)))' }}
            >
              {isLoading ? (
                <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/40" role="status">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan/20 border-t-cyan" />
                  <p className="font-heading text-sm text-lavender/70">Fetching real images from NASA{'\u2026'}</p>
                </div>
              ) : imagePlaceholder && currentObs ? (
                <ObservationImage placeholder={imagePlaceholder} src={imageSrc} badge={channelUm !== undefined ? `Live \u00b7 ${channelUm.toFixed(2)} \u00b5m` : liveData?.kind === 'unwise' ? 'NASA NEOWISE' : undefined}>
                  <div className="absolute right-3 top-3 rounded-xl bg-black/55 px-3.5 py-2 text-right backdrop-blur-md">
                    <p className="font-display text-2xl leading-none text-neon sm:text-3xl">{currentObs.observationEpoch}</p>
                    <p className="mt-1.5 font-heading text-xs text-soft-white/90 sm:text-sm">
                      {formatObservationDate(currentObs.observationDate)}
                    </p>
                    {!isLive && activeBand && (
                      <p className="mt-0.5 font-body text-[11px] text-lavender/60 sm:text-xs">{activeBand.wavelengthRange}</p>
                    )}
                  </div>
                </ObservationImage>
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl border border-white/10 bg-black/40">
                  <p className="font-heading text-sm text-lavender/50">No observations available</p>
                </div>
              )}

              {!isLoading && (
                <div className="mt-4">
                  <ObservationTimeline observations={observations} index={obsIndex} onChange={setObsIndex} />
                </div>
              )}

              {!isLoading && imagePlaceholder && (isLive ? (
                hasChannels ? <ChannelSlider channel={channel} onChange={onChannel} wavelengthOf={wavelengthOf} /> : null
              ) : (
                <SpectralBandSelector bands={bands} selectedBandId={selectedBand} onSelect={setSelectedBand} />
              ))}
            </div>
          </motion.div>

          {/* Right, middle: the animated object */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="order-3 flex items-center justify-center py-4 md:order-none md:col-start-2 md:row-start-2"
          >
            <div className="origin-center scale-75 sm:scale-90 lg:scale-100">
              <ObjectDisplay object={obj} />
            </div>
          </motion.div>

          {/* Live data, notes, context */}
          <div className="order-5 md:order-none md:col-span-2 md:row-start-4">
            <LiveInsights obj={obj} info={info} current={currentObs} markerUm={channelUm} />
          </div>

          {/* Right, bottom: actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="order-4 flex flex-wrap gap-3 md:order-none md:col-start-2 md:row-start-3"
          >
            <RoundedButton
              variant="secondary"
              size="md"
              className="hover:border-neon/50 hover:text-neon"
              onClick={() => navigate(`/story/${obj.id}`)}
            >
              <BookOpen className="h-4 w-4" />
              Read About It
            </RoundedButton>
            {observations.length > 0 && (
              <RoundedButton variant="accent" size="md" onClick={() => navigate(`/play/${obj.id}`)}>
                <Play className="h-4 w-4" />
                Play
              </RoundedButton>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
