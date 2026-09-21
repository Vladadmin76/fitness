import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { ExerciseLog, PersonalRecord, PlannedExercise, WgerExercise, WorkoutSession as Session } from '../types'
import { getProfile } from '../lib/storage'
import { addSession } from '../lib/storage'
import { updatePRsFromSession } from '../lib/prTracker'
import { ExerciseCard } from '../components/ExerciseCard'
import { MusicPlayer } from '../components/MusicPlayer'

interface LocationState {
  plan: { warmup: PlannedExercise[]; workout: PlannedExercise[] }
}

export function WorkoutSession() {
  const location = useLocation()
  const navigate = useNavigate()
  const profile = getProfile()
  const state = location.state as LocationState | undefined

  const [sequence, setSequence] = useState<PlannedExercise[]>(() =>
    state ? [...state.plan.warmup, ...state.plan.workout] : [],
  )
  const [index, setIndex] = useState(0)
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [finished, setFinished] = useState<PersonalRecord[] | null>(null)

  if (!profile) return <Navigate to="/settings" replace />
  if (!state) return <Navigate to="/workout/new" replace />

  const current = sequence[index]

  function handleComplete(log: ExerciseLog) {
    const nextLogs = [...logs, log]
    setLogs(nextLogs)
    if (index < sequence.length - 1) {
      setIndex(index + 1)
      return
    }
    const session: Session = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      goal: profile!.goal,
      location: profile!.location,
      exercises: nextLogs,
    }
    addSession(session)
    setFinished(updatePRsFromSession(session))
  }

  function handleSubstitute(next: WgerExercise) {
    setSequence((prev) =>
      prev.map((p, i) => (i === index ? { ...p, exercise: next } : p)),
    )
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 text-center">
        <h1 className="text-2xl font-semibold">Тренировка завершена 💪</h1>
        {finished.length > 0 ? (
          <div>
            <p className="mb-2 text-slate-300">Новые рекорды:</p>
            <ul className="space-y-1">
              {finished.map((pr) => (
                <li key={pr.exerciseId} className="rounded bg-slate-800/60 px-3 py-2 text-sm">
                  {pr.exerciseName}: {pr.bestWeight} кг × {pr.bestReps}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-slate-400">Записано в историю.</p>
        )}
        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-medium hover:bg-indigo-500"
        >
          На главную
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {current.kind === 'warmup' ? 'Разминка' : 'Тренировка'} · {index + 1}/{sequence.length}
        </h1>
      </div>

      <MusicPlayer />

      <ExerciseCard
        key={current.exercise.id}
        planned={current}
        allowSubstitute={profile.location === 'gym'}
        onComplete={handleComplete}
        onSubstitute={handleSubstitute}
      />
    </div>
  )
}
