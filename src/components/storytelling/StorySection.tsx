import { motion } from 'framer-motion'
import type { StorySection as StorySectionData } from '../../data/models'
import { StoryImage } from './StoryImage'

// Alternating layout: even sections are image-left/text-right, odd sections are
// text-left/image-right. Stacks vertically on mobile. Descriptions may contain several
// paragraphs separated by blank lines.
export function StorySection({ section, index }: { section: StorySectionData; index: number }) {
  const imageLeft = index % 2 === 0
  const paragraphs = section.description.split('\n\n')

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, amount: 0.2 }}
      className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12"
    >
      <div className={imageLeft ? 'md:order-1' : 'md:order-2'}>
        <StoryImage placeholder={section.image} photo={section.photo} />
      </div>
      <div className={imageLeft ? 'md:order-2' : 'md:order-1'}>
        <span className="font-heading text-xs uppercase tracking-[0.4em] text-cyan/70">0{index + 1}</span>
        <h2 className="font-display mt-2 text-2xl text-soft-white sm:text-3xl">{section.title}</h2>
        <div className="mt-3 space-y-3">
          {paragraphs.map((p, i) => (
            <p key={i} className="font-body text-sm leading-relaxed text-lavender/80 sm:text-[0.95rem]">
              {p}
            </p>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
