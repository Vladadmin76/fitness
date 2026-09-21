import { useState } from 'react'
import type { ExerciseLog, PlannedExercise, WgerExercise } from '../types'
import { MuscleDiagram } from './MuscleDiagram'
import { ExerciseAnimation } from './ExerciseAnimation'
import { RestTimer } from './RestTimer'
import { findAlternatives } from '../lib/substitution'

interface SetRow {
  weight: number
  reps: number
  done: boolean
}

interface Props {
  planned: PlannedExercise
  allowSubstitute: boolean
  onComplete: (log: ExerciseLog) => void
  onSubstitute: (next: WgerExercise) => void
}

export function ExerciseCard({ planned, allowSubstitute, onComplete, onSubstitute }: Props) {
  const { exercise } = planned
  const [rows, setRows] = useState<SetRow[]>(
    Array.from({ length: planned.targetSets }, () => ({
      weight: planned.suggestedWeight ?? 0,
      reps: planned.repRangeLow,
      done: false,
    })),
  )
  const [showDescription, setShowDescription] = useState(false)
  const [showSubstitutes, setShowSubstitutes] = useState(false)
  const [alternatives, setAlternatives] = useState<WgerExercise[] | null>(null)
  const [restTrigger, setRestTrigger] = useState(0)

  const allDone = rows.every((r) => r.done)
  const image = exercise.images[0]

  function updateRow(idx: number, patch: Partial<SetRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function markDone(idx: number) {
    updateRow(idx, { done: true })
    if (idx < rows.length - 1) setRestTrigger((t) => t + 1)
  }

  function finishExercise() {
    onComplete({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      repRangeLow: planned.repRangeLow,
      repRangeHigh: planned.repRangeHigh,
      sets: rows.map((r) => ({ weight: r.weight, reps: r.reps, completedAt: new Date().toISOString() })),
    })
  }

  async function openSubstitutes() {
    setShowSubstitutes(true)
    if (!alternatives) {
      const alts = await findAlternatives(exercise)
      setAlternatives(alts)
    }
  }

  return (
    <div className="rounded-xl bg-slate-800/60 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100">{exercise.name}</h3>
        {allowSubstitute && (
          <button
            onClick={openSubstitutes}
            className="shrink-0 rounded bg-slate-700 px-3 py-1 text-xs hover:bg-slate-600"
          >
            Заменить
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <ExerciseAnimation frames={exercise.animationFrames} staticImage={image} alt={exercise.name} />
        <MuscleDiagram
          primaryMuscleIds={exercise.muscles}
          secondaryMuscleIds={exercise.musclesSecondary}
        />
      </div>

      <button
        onClick={() => setShowDescription((v) => !v)}
        className="mb-3 rounded bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600"
      >
        {showDescription ? 'Скрыть технику' : 'Как выполнять'}
      </button>
      {showDescription && (
        <p className="mb-3 whitespace-pre-line text-sm text-slate-300">
          {exercise.description || 'Описание пока недоступно для этого упражнения.'}
        </p>
      )}

      <p className="mb-2 text-xs text-slate-400">
        Диапазон повторений: {planned.repRangeLow}–{planned.repRangeHigh}
      </p>

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-6 text-sm text-slate-400">#{idx + 1}</span>
            <input
              type="number"
              value={row.weight}
              onChange={(e) => updateRow(idx, { weight: Number(e.target.value) })}
              disabled={row.done}
              className="w-20 rounded bg-slate-700 px-2 py-1 disabled:opacity-50"
            />
            <span className="text-xs text-slate-400">кг ×</span>
            <input
              type="number"
              value={row.reps}
              onChange={(e) => updateRow(idx, { reps: Number(e.target.value) })}
              disabled={row.done}
              className="w-16 rounded bg-slate-700 px-2 py-1 disabled:opacity-50"
            />
            <span className="text-xs text-slate-400">повт.</span>
            {!row.done ? (
              <button
                onClick={() => markDone(idx)}
                className="ml-auto rounded bg-indigo-600 px-3 py-1 text-sm hover:bg-indigo-500"
              >
                Готово
              </button>
            ) : (
              <span className="ml-auto text-sm text-emerald-400">✓</span>
            )}
          </div>
        ))}
      </div>

      {restTrigger > 0 && !allDone && (
        <div className="mt-3">
          <RestTimer key={restTrigger} autoStart />
        </div>
      )}

      {allDone && (
        <button
          onClick={finishExercise}
          className="mt-4 w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500"
        >
          Следующее упражнение
        </button>
      )}

      {showSubstitutes && (
        <div className="mt-4 rounded-lg bg-slate-900 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Замена (та же мышца, другое оборудование)</span>
            <button onClick={() => setShowSubstitutes(false)} className="text-xs text-slate-400">
              закрыть
            </button>
          </div>
          {!alternatives && <p className="text-sm text-slate-400">Ищу варианты…</p>}
          {alternatives?.length === 0 && (
            <p className="text-sm text-slate-400">Альтернатив не найдено.</p>
          )}
          <ul className="space-y-1">
            {alternatives?.map((alt) => (
              <li key={alt.id}>
                <button
                  onClick={() => {
                    onSubstitute(alt)
                    setShowSubstitutes(false)
                  }}
                  className="w-full rounded bg-slate-700 px-3 py-2 text-left text-sm hover:bg-slate-600"
                >
                  {alt.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
