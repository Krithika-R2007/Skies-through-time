import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import { Play } from 'lucide-react'
import { PageTransition } from '../components/shared/PageTransition'
import { ObjectPageHeader } from '../components/navigation/ObjectPageHeader'
import { ObjectDisplay } from '../components/celestial-objects/ObjectDisplay'
import { StorySection } from '../components/storytelling/StorySection'
import { RoundedButton } from '../components/shared/RoundedButton'
import { useDataProvider } from '../data/providers/DataContext'
import { OBJECT_TYPE_LABELS } from '../data/models'
import { useObjectObservations } from '../hooks/useObjectObservations'
import { DataSourceBadge } from '../components/observation-panel/LiveInsights'

// Alternating image/text storytelling page. Content comes entirely from provider data,
// so the same template renders every star, comet or galaxy. The header stays pinned and a
// thin progress line tracks how far through the story the reader is.
export default function ObjectStoryPage() {
  const { objectId } = useParams()
  const navigate = useNavigate()
  const provider = useDataProvider()
  const obj = objectId ? provider.getObjectById(objectId) : undefined
  const baseStory = obj ? provider.getObjectStory(obj.id) : undefined
  const info = useObjectObservations(obj)
  const isLive = info.mode === 'live'
  // With real data, the observation-history section reports what the archive actually holds.
  const story = baseStory && isLive && info.card
    ? {
        ...baseStory,
        sections: baseStory.sections.map((s) =>
          s.title === 'Its Observation History'
            ? { ...s, description: [info.card!.narrative, s.description.split('\n\n').slice(1).join('\n\n')].filter(Boolean).join('\n\n') }
            : s,
        ),
      }
    : baseStory

  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: scrollRef })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  if (!obj || !story) {
    return (
      <PageTransition>
        <div className="flex h-full items-center justify-center">
          <p className="font-heading text-lavender/60">Story not available.</p>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="relative h-full w-full">
        <ObjectPageHeader />
        <motion.div
          aria-hidden
          className="absolute left-0 right-0 top-0 z-40 h-0.5 origin-left bg-cyan"
          style={{ scaleX: progress }}
        />

        <div ref={scrollRef} className="h-full w-full overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-10">
            {/* Hero: the object itself, then its name */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-20 flex flex-col items-center text-center"
            >
              <div className="-my-10 origin-center scale-[0.55] sm:scale-[0.7]">
                <ObjectDisplay object={obj} />
              </div>
              <span className="mt-5 font-heading text-xs uppercase tracking-[0.5em] text-cyan/80">
                {OBJECT_TYPE_LABELS[obj.objectType]}
              </span>
              <h1 className="font-display mt-3 text-4xl text-soft-white drop-shadow-[0_0_30px_rgba(90,217,230,0.18)] sm:text-5xl md:text-6xl">
                {obj.name}
              </h1>
              <p className="mt-4 max-w-xl font-body text-base text-lavender/75 sm:text-lg">{obj.description}</p>
              <div className="mt-4"><DataSourceBadge info={info} /></div>
            </motion.div>

            <div className="space-y-20">
              {story.sections.map((section, i) => (
                <StorySection key={section.title} section={section} index={i} />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mt-20 flex flex-col items-center gap-4 text-center"
            >
              <p className="font-body text-sm text-lavender/60">
                {isLive ? 'Observation details come from NASA\u2019s SPHEREx archive at IRSA.' : null}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <RoundedButton variant="secondary" size="md" onClick={() => navigate(`/explore/${obj.id}`)}>
                  Back to Object
                </RoundedButton>
                {provider.getObservations(obj.id).length > 0 && (
                  <RoundedButton variant="primary" size="md" onClick={() => navigate(`/play/${obj.id}`)}>
                    <Play className="h-5 w-5" />
                    Watch the Changes
                  </RoundedButton>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
