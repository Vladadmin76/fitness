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

  return <img src={src} alt={alt} className="h-40 w-40 rounded-lg object-cover" />
}
