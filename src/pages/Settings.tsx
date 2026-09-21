import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Goal, Location, UserProfile, WgerEquipment, WgerMuscle } from '../types'
import { getEquipment, getMuscles } from '../lib/wgerApi'
import { getProfile, saveProfile } from '../lib/storage'
import { BODYWEIGHT_EQUIPMENT_ID } from '../lib/exerciseSelector'
import { equipmentNameRu, muscleNameRu } from '../lib/i18n'

export function Settings() {
  const navigate = useNavigate()
  const existing = getProfile()

  const [muscles, setMuscles] = useState<WgerMuscle[]>([])
  const [equipment, setEquipment] = useState<WgerEquipment[]>([])

  const [goal, setGoal] = useState<Goal>(existing?.goal ?? 'muscle_group')
  const [targetMuscleIds, setTargetMuscleIds] = useState<number[]>(existing?.targetMuscleIds ?? [])
  const [location, setLocation] = useState<Location>(existing?.location ?? 'home')
  const [homeEquipmentIds, setHomeEquipmentIds] = useState<number[]>(existing?.homeEquipmentIds ?? [])
  const [dumbbellWeights, setDumbbellWeights] = useState(
    (existing?.homeDumbbellWeightsKg ?? []).join(', '),
  )

  useEffect(() => {
    getMuscles().then(setMuscles)
    getEquipment().then((all) => setEquipment(all.filter((e) => e.id !== BODYWEIGHT_EQUIPMENT_ID)))
  }, [])

  function toggle(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }

  function handleSave() {
    const profile: UserProfile = {
      goal,
      targetMuscleIds: goal === 'weight_loss' ? muscles.map((m) => m.id) : targetMuscleIds,
      location,
      homeEquipmentIds: location === 'home' ? homeEquipmentIds : [],
      homeDumbbellWeightsKg:
        location === 'home' && homeEquipmentIds.includes(dumbbellId(equipment))
          ? dumbbellWeights
              .split(',')
              .map((s) => Number(s.trim()))
              .filter((n) => !Number.isNaN(n) && n > 0)
              .sort((a, b) => a - b)
          : [],
    }
    saveProfile(profile)
    navigate('/')
  }

  const showDumbbellWeights = location === 'home' && homeEquipmentIds.includes(dumbbellId(equipment))
  const canSave = goal === 'weight_loss' || targetMuscleIds.length > 0

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Настройки</h1>

      <section>
        <h2 className="mb-2 font-medium">Цель</h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={goal === 'muscle_group'}
              onChange={() => setGoal('muscle_group')}
            />
            Группы мышц
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={goal === 'weight_loss'}
              onChange={() => setGoal('weight_loss')}
            />
            Похудение
          </label>
        </div>
      </section>

      {goal === 'muscle_group' && (
        <section>
          <h2 className="mb-2 font-medium">Какие группы мышц прорабатываем</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {muscles.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={targetMuscleIds.includes(m.id)}
                  onChange={() => setTargetMuscleIds((prev) => toggle(prev, m.id))}
                />
                {muscleNameRu(m)}
              </label>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-medium">Где занимаемся</h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input type="radio" checked={location === 'home'} onChange={() => setLocation('home')} />
            Дома
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={location === 'gym'} onChange={() => setLocation('gym')} />
            Зал
          </label>
        </div>
      </section>

      {location === 'home' && (
        <section>
          <h2 className="mb-2 font-medium">Какой инвентарь есть дома</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {equipment.map((eq) => (
              <label key={eq.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={homeEquipmentIds.includes(eq.id)}
                  onChange={() => setHomeEquipmentIds((prev) => toggle(prev, eq.id))}
                />
                {equipmentNameRu(eq.name)}
              </label>
            ))}
          </div>

          {showDumbbellWeights && (
            <div className="mt-3">
              <label className="mb-1 block text-sm text-slate-300">
                Какие веса гантелей есть (кг, через запятую)
              </label>
              <input
                value={dumbbellWeights}
                onChange={(e) => setDumbbellWeights(e.target.value)}
                placeholder="например: 4, 6, 8, 10"
                className="w-full rounded bg-slate-700 px-3 py-2"
              />
            </div>
          )}
        </section>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full rounded-lg bg-indigo-600 py-3 font-medium hover:bg-indigo-500 disabled:opacity-40"
      >
        Сохранить
      </button>

      <Link to="/debug" className="block text-center text-sm text-slate-500 underline">
        Технический журнал
      </Link>
    </div>
  )
}

function dumbbellId(equipment: WgerEquipment[]): number {
  return equipment.find((e) => e.name.toLowerCase() === 'dumbbell')?.id ?? -1
}
