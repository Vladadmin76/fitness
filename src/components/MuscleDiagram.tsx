import { useEffect, useState } from 'react'
import type { WgerMuscle } from '../types'
import { getMuscles } from '../lib/wgerApi'

const FRONT_BASE = 'https://wger.de/static/images/muscles/muscular_system_front.svg'
const BACK_BASE = 'https://wger.de/static/images/muscles/muscular_system_back.svg'

const PRIMARY_TINT = 'invert(20%) sepia(94%) saturate(3963%) hue-rotate(353deg) brightness(93%) contrast(89%)'
const SECONDARY_TINT = 'invert(68%) sepia(53%) saturate(1073%) hue-rotate(1deg) brightness(103%) contrast(101%)'

interface Props {
  primaryMuscleIds: number[]
  secondaryMuscleIds: number[]
}

function BodyView({
  base,
  layers,
}: {
  base: string
  layers: { muscle: WgerMuscle; isPrimary: boolean }[]
}) {
  return (
    <div className="relative inline-block">
      <img src={base} alt="" className="block h-64 w-auto opacity-40" />
      {layers.map(({ muscle, isPrimary }) => (
        <img
          key={muscle.id}
          src={muscle.image_url_main}
          alt=""
          className="absolute inset-0 h-64 w-auto"
          style={{ filter: isPrimary ? PRIMARY_TINT : SECONDARY_TINT }}
        />
      ))}
    </div>
  )
}

export function MuscleDiagram({ primaryMuscleIds, secondaryMuscleIds }: Props) {
  const [muscles, setMuscles] = useState<WgerMuscle[]>([])

  useEffect(() => {
    let active = true
    getMuscles().then((m) => {
      if (active) setMuscles(m)
    })
    return () => {
      active = false
    }
  }, [])

  if (muscles.length === 0) return null

  const byId = new Map(muscles.map((m) => [m.id, m]))
  const layers = [
    ...primaryMuscleIds.map((id) => ({ id, isPrimary: true })),
    ...secondaryMuscleIds.map((id) => ({ id, isPrimary: false })),
  ]
    .map(({ id, isPrimary }) => {
      const muscle = byId.get(id)
      return muscle ? { muscle, isPrimary } : null
    })
    .filter((x): x is { muscle: WgerMuscle; isPrimary: boolean } => x !== null)

  const front = layers.filter((l) => l.muscle.is_front)
  const back = layers.filter((l) => !l.muscle.is_front)

  if (front.length === 0 && back.length === 0) return null

  return (
    <div className="flex justify-center gap-4 py-2">
      {front.length > 0 && <BodyView base={FRONT_BASE} layers={front} />}
      {back.length > 0 && <BodyView base={BACK_BASE} layers={back} />}
    </div>
  )
}
