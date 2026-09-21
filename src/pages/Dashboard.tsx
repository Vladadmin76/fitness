import { Link, Navigate } from 'react-router-dom'
import { getPRs, getProfile, getSessions } from '../lib/storage'
import { computeStreak, sessionsThisWeek } from '../lib/streak'

export function Dashboard() {
  const profile = getProfile()
  if (!profile) return <Navigate to="/settings" replace />

  const sessions = getSessions()
  const prs = getPRs().slice(-3).reverse()
  const streak = computeStreak(sessions)
  const thisWeek = sessionsThisWeek(sessions)

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Привет!</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-800/60 p-4 text-center">
          <p className="text-3xl font-bold text-indigo-400">{streak}</p>
          <p className="text-sm text-slate-400">дней подряд</p>
        </div>
        <div className="rounded-xl bg-slate-800/60 p-4 text-center">
          <p className="text-3xl font-bold text-indigo-400">{thisWeek}</p>
          <p className="text-sm text-slate-400">тренировок на этой неделе</p>
        </div>
      </div>

      <Link
        to="/workout/new"
        className="block rounded-lg bg-indigo-600 py-3 text-center font-medium hover:bg-indigo-500"
      >
        Начать тренировку
      </Link>

      {prs.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium">Последние рекорды</h2>
          <ul className="space-y-1">
            {prs.map((pr) => (
              <li key={pr.exerciseId} className="rounded bg-slate-800/60 px-3 py-2 text-sm">
                {pr.exerciseName}: {pr.bestWeight} кг × {pr.bestReps}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-slate-400">
        Цель: {profile.goal === 'weight_loss' ? 'похудение' : 'группы мышц'} · Место:{' '}
        {profile.location === 'home' ? 'дома' : 'зал'} —{' '}
        <Link to="/settings" className="underline">
          изменить
        </Link>
      </p>
    </div>
  )
}
