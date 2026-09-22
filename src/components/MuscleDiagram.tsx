import { useEffect, useState } from 'react'
import type { WgerMuscle } from '../types'
import { getMuscles } from '../lib/wgerApi'
import { fetchColoredMuscleSvg } from '../lib/muscleSvg'
import { log } from '../lib/log'

const FRONT_BASE = 'https://wger.de/static/images/muscles/muscular_system_front.svg'
const BACK_BASE = 'https://wger.de/static/images/muscles/muscular_system_back.svg'

const PRIMARY_COLOR = '#ef4444'
const SECONDARY_COLOR = '#f59e0b'

interface Props {
  primaryMuscleIds: number[]
  secondaryMuscleIds: number[]
}

function MuscleOverlay({ muscle, color }: { muscle: WgerMuscle; color: string }) {
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchColoredMuscleSvg(muscle.image_url_main, color).then((result) => {
      if (active) setSvg(result)
    })
    return () => {
      active = false
    }
  }, [muscle.image_url_main, color])

  if (!svg) return null
  // SVG markup fetched from wger's own static assets and recolored by us — not user input.
  return <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: svg }} />
}

function BodyView({
  base,
  layers,
}: {
  base: string
  layers: { muscle: WgerMuscle; isPrimary: boolean }[]
}) {
  return (
    <div className="relative inline-block h-64 w-36">
      <img src={base} alt="" className="block h-64 w-36 opacity-40" />
      {layers.map(({ muscle, isPrimary }) => (
        <MuscleOverlay key={muscle.id} muscle={muscle} color={isPrimary ? PRIMARY_COLOR : SECONDARY_COLOR} />
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
      if (!muscle) {
        log('warn', `Мышцы: ID мышцы ${id} из упражнения не найден в справочнике wger (${muscles.length} мышц загружено) — не будет подсвечен`)
      }
      return muscle ? { muscle, isPrimary } : null
    })
    .filter((x): x is { muscle: WgerMuscle; isPrimary: boolean } => x !== null)

  const front = layers.filter((l) => l.muscle.is_front)
  const back = layers.filter((l) => !l.muscle.is_front)

  if (front.length === 0 && back.length === 0) {
    if (primaryMuscleIds.length > 0 || secondaryMuscleIds.length > 0) {
      log('warn', `Мышцы: для упражнения заданы ID (${[...primaryMuscleIds, ...secondaryMuscleIds].join(',')}), но ни одна мышца не отобразилась`)
    }
    return null
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex justify-center gap-4">
        {front.length > 0 && <BodyView base={FRONT_BASE} layers={front} />}
        {back.length > 0 && <BodyView base={BACK_BASE} layers={back} />}
      </div>
      <div className="flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }} />
          Основная мышца
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SECONDARY_COLOR }} />
          Вспомогательная мышца
        </span>
      </div>
    </div>
  )
}
