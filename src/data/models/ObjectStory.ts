import type { ImagePlaceholder } from './ImagePlaceholder'

/** A real image (usually from NASA) shown beside a story section. */
export interface StoryPhoto {
  /** Path served by the app (public/story/...). */
  src: string
  alt: string
  /** What the picture shows, and whether it is an illustration or the object itself. */
  caption: string
  credit: string
  /** The NASA page the image came from. */
  sourceUrl: string
}

export interface StorySection {
  title: string
  description: string
  image: ImagePlaceholder
  /** When present, shown instead of the generated placeholder. */
  photo?: StoryPhoto
}

export interface ObjectStory {
  objectId: string
  sections: StorySection[]
  isDemoData: boolean
}
