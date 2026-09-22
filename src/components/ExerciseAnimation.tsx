import { useEffect, useState } from 'react'

const FRAME_INTERVAL_MS = 700

interface Props {
  frames: string[] | null
  staticImage: string | undefined
  alt: string
}

export function ExerciseAnimation({ frames, staticImage, alt }: Props) {
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    if (!frames || frames.length < 2) return
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length)
    }, FRAME_INTERVAL_MS)
    return () => clearInterval(id)
  }, [frames])

  const src = frames && frames.length > 0 ? frames[frameIndex] : staticImage
  if (!src) return null

  // wger's own stock photos are often wide (landscape demo shots), while
  // free-exercise-db frames tend to be closer to square — object-cover
  // would crop a wide photo's edges off inside this fixed box, which is
  // exactly what cut a second person out of frame. object-contain always
  // shows the whole image, at the cost of some letterboxing on wide ones.
  return (
    <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-white">
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </div>
  )
}
