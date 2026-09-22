import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { PlannedExercise } from '../types'
import { getProfile, getSessions } from '../lib/storage'
import { generateWorkoutPlan } from '../lib/exerciseSelector'

export function WorkoutPreview() {
  const navigate = useNavigate()
  const profile = getProfile()
  const [plan, setPlan] = useState<{ warmup: PlannedExercise[]; workout: PlannedExercise[] } | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!profile) return
    setLoading(true)
    setError(null)
    try {
      const result = await generateWorkoutPlan(profile, getSessions())
      setPlan(result)
    } catch {
      setError('Не удалось загрузить упражнения. Проверь подключение к интернету и попробуй ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!profile) return <Navigate to="/settings" replace />

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Тренировка на сегодня</h1>

      {loading && <p className="text-slate-400">Подбираю упражнения…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {plan && (
        <>
          <Section title="Разминка" items={plan.warmup} />
          <Section title="Основная часть" items={plan.workout} />

          <div className="flex gap-3">
            <button
              onClick={load}
              className="flex-1 rounded-lg bg-slate-700 py-3 font-medium hover:bg-slate-600"
            >
              Пересоздать
            </button>
            <button
              onClick={() => navigate('/workout/session', { state: { plan }, replace: true })}
              className="flex-1 rounded-lg bg-indigo-600 py-3 font-medium hover:bg-indigo-500"
            >
              Начать
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, items }: { title: string; items: PlannedExercise[] }) {
  return (
    <section>
      <h2 className="mb-2 font-medium">{title}</h2>
      {items.length === 0 && (
        <p className="text-sm text-slate-400">Не нашлось подходящих упражнений — попробуй добавить инвентарь в настройках.</p>
      )}
      <ul className="space-y-1">
        {items.map((p) => (
          <li key={p.exercise.id} className="flex justify-between rounded bg-slate-800/60 px-3 py-2 text-sm">
            <span>{p.exercise.name}</span>
            <span className="text-slate-400">
              {p.targetSets} × {p.repRangeLow}–{p.repRangeHigh}
              {p.suggestedWeight ? ` · ${p.suggestedWeight} кг` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
