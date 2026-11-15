import { useMemo, useState } from 'react'
import { createObservationDataURL } from '../../utils/proceduralTexture'
import type { ImagePlaceholder, StoryPhoto } from '../../data/models'

// A story picture. With a `photo` it shows the real image with its caption and credit under
// it; if the file cannot load, or there is no photo, it falls back to the generated artwork.
export function StoryImage({ placeholder, photo }: { placeholder: ImagePlaceholder; photo?: StoryPhoto }) {
  const dataUrl = useMemo(() => createObservationDataURL(placeholder, 600, 450), [placeholder])
  const [failed, setFailed] = useState(false)
  const real = photo && !failed

  return (
    <figure>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
        {real ? (
          <img
            src={photo.src}
            alt={photo.alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className="block h-auto w-full"
          />
        ) : (
          <img src={dataUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      {real && (
        <figcaption className="mt-2 px-1 font-body text-xs leading-snug text-lavender/60">
          {photo.caption}{' '}
          <a
            href={photo.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-cyan/70 underline-offset-2 hover:underline"
          >
            {photo.credit}
          </a>
        </figcaption>
      )}
    </figure>
  )
}
