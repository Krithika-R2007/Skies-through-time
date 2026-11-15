import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'
import { CURATED_STORY_IDS } from '../data/mock/curatedStories'
import { artFor } from '../animations/objectArt'

const provider = new MockAstronomyProvider()
const TITLES = [
  'Meet the Object',
  'Why Should We Care?',
  'Its Observation History',
  'Investigate the Evidence',
  'What Changed?',
  'What Can We Learn?',
]

describe('researched stories with NASA images', () => {
  it('covers Barnard\u2019s Star, Epsilon Indi B and WISE 0855', () => {
    expect(CURATED_STORY_IDS).toEqual(expect.arrayContaining(['barnards', 'epsindib', 'wise0855']))
  })

  it('Epsilon Indi B is a brown dwarf in the catalogue', () => {
    const o = provider.getObjectById('epsindib')!
    expect(o.name).toBe('Epsilon Indi B')
    expect(o.objectType).toBe('brownDwarf')
  })

  for (const id of ['barnards', 'epsindib', 'wise0855']) {
    describe(id, () => {
      const story = provider.getObjectStory(id)!

      it('keeps the six standard sections, in order', () => {
        expect(story.sections.map((s) => s.title)).toEqual(TITLES)
      })

      it('gives every section a real image with caption and credit', () => {
        for (const s of story.sections) {
          expect(s.photo, s.title).toBeDefined()
          expect(s.photo!.caption.length).toBeGreaterThan(20)
          expect(s.photo!.credit.length).toBeGreaterThan(3)
          expect(s.photo!.sourceUrl).toMatch(/^https:\/\//)
        }
      })

      it('uses six different pictures', () => {
        expect(new Set(story.sections.map((s) => s.photo!.src)).size).toBe(6)
      })

      it('ships every image in public/story', () => {
        for (const s of story.sections) {
          const file = s.photo!.src.split('/story/')[1]
          expect(existsSync(join(process.cwd(), 'public', 'story', file)), file).toBe(true)
        }
      })

      it('answers a question in every section', () => {
        for (const s of story.sections.filter((x) => x.title !== 'Its Observation History')) {
          expect(s.description.split('\n\n')[0]).toContain('?')
        }
      })
    })
  }

  it('Epsilon Indi B is drawn with its own picture, and the file ships', () => {
    const art = artFor('epsindib')
    expect(art).toBeDefined()
    expect(art!.kind).toBe('alpha')
    expect(art!.src).toMatch(/objects\/epsindib\.png$/)
    expect(existsSync(join(process.cwd(), 'public', 'objects', 'epsindib.png'))).toBe(true)
  })

  it('other objects keep the generated story', () => {
    const s = provider.getObjectStory('sirius')!
    expect(s.sections.every((x) => !x.photo)).toBe(true)
  })
})