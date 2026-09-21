import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WorkoutSession } from '../types'
import { estimateOneRepMax } from '../lib/prTracker'

interface Props {
  sessions: WorkoutSession[]
  exerciseId: number
}

export function ProgressChart({ sessions, exerciseId }: Props) {
  const points = sessions
    .map((s) => {
      const log = s.exercises.find((e) => e.exerciseId === exerciseId)
      if (!log || log.sets.length === 0) return null
      const best1RM = Math.max(...log.sets.map((set) => estimateOneRepMax(set.weight, set.reps)))
      return {
        date: new Date(s.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        est1RM: Math.round(best1RM * 10) / 10,
      }
    })
    .filter((p): p is { date: string; est1RM: number } => p !== null)

  if (points.length === 0) {
    return <p className="text-sm text-slate-400">Пока нет данных по этому упражнению.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#94a3b8" fontSize={12} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
        />
        <Line type="monotone" dataKey="est1RM" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
