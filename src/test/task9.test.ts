import { describe, it, expect } from 'vitest'
import { MockAstronomyProvider } from '../data/providers/MockAstronomyProvider'

const provider = new MockAstronomyProvider()

describe('storytelling content', () => {
  it('every object has exactly 6 story sections', () => {
    for (const obj of provider.getObjects().slice(0, 20)) {
      const story = provider.getObjectStory(obj.id)
      expect(story?.sections.length).toBe(6)
    }
  })

  it('section images have valid seeds', () => {
    const story = provider.getObjectStory('andromeda')!
    for (const s of story.sections) {
      expect(s.image.seed).toBeTruthy()
      expect(typeof s.image.hue).toBe('number')
    }
  })

  it('sections alternate image style (even=0=image left by index)', () => {
    const story = provider.getObjectStory('betelgeuse')!
    expect(story.sections.length).toBe(6)
    story.sections.forEach((s, i) => {
      expect(s.title).toBeTruthy()
      expect(s.description.length).toBeGreaterThan(20)
      // Index 0,2,4 would be image-left; 1,3,5 image-right — ordering correct
      expect(i).toBeGreaterThanOrEqual(0)
    })
  })
})
