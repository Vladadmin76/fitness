import { useState } from 'react'
import { getPRs, getSessions } from '../lib/storage'
import { ProgressChart } from '../components/ProgressChart'

export function History() {
  const sessions = [...getSessions()].reverse()
  const prs = getPRs()

  const exerciseOptions = Array.from(
    new Map(
      getSessions()
        .flatMap((s) => s.exercises)
        .map((e) => [e.exerciseId, e.exerciseName]),
    ).entries(),
  )
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    exerciseOptions[0]?.[0] ?? null,
  )

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <h1 className="text-2xl font-semibold">История</h1>

      {exerciseOptions.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium">Прогресс по упражнению</h2>
          <select
            value={selectedExerciseId ?? ''}
            onChange={(e) => setSelectedExerciseId(Number(e.target.value))}
            className="mb-3 w-full rounded bg-slate-700 px-3 py-2"
          >
            {exerciseOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          {selectedExerciseId !== null && (
            <ProgressChart sessions={getSessions()} exerciseId={selectedExerciseId} />
          )}
        </section>
      )}

      {prs.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium">Личные рекорды</h2>
          <ul className="space-y-1">
            {prs.map((pr) => (
              <li key={pr.exerciseId} className="rounded bg-slate-800/60 px-3 py-2 text-sm">
                {pr.exerciseName}: {pr.bestWeight} кг × {pr.bestReps} (расч. 1ПМ ≈ {pr.estOneRepMax} кг)
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-medium">Тренировки</h2>
        {sessions.length === 0 && <p className="text-sm text-slate-400">Пока пусто.</p>}
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="rounded bg-slate-800/60 px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span>{new Date(s.date).toLocaleString('ru-RU')}</span>
                <span className="text-slate-400">
                  {s.goal === 'weight_loss' ? 'похудение' : 'группы мышц'} · {s.location === 'home' ? 'дома' : 'зал'}
                </span>
              </div>
              <p className="mt-1 text-slate-400">{s.exercises.map((e) => e.exerciseName).join(', ')}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
