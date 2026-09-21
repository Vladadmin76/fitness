import type { ExerciseLog, PersonalRecord, WorkoutSession } from '../types'
import { getPRs, savePRs } from './storage'

export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0) return 0
  return weight * (1 + reps / 30)
}

/** Updates stored PRs from a finished session and returns the ones that were beaten. */
export function updatePRsFromSession(session: WorkoutSession): PersonalRecord[] {
  const prs = getPRs()
  const beaten: PersonalRecord[] = []

  for (const log of session.exercises) {
    const best = bestSetOf(log)
    if (!best) continue

    const est1RM = estimateOneRepMax(best.weight, best.reps)
    const existing = prs.find((p) => p.exerciseId === log.exerciseId)

    if (!existing || est1RM > existing.estOneRepMax) {
      const record: PersonalRecord = {
        exerciseId: log.exerciseId,
        exerciseName: log.exerciseName,
        bestWeight: best.weight,
        bestReps: best.reps,
        estOneRepMax: Math.round(est1RM * 10) / 10,
        achievedAt: session.date,
      }
      const idx = prs.findIndex((p) => p.exerciseId === log.exerciseId)
      if (idx >= 0) prs[idx] = record
      else prs.push(record)
      beaten.push(record)
    }
  }

  savePRs(prs)
  return beaten
}

function bestSetOf(log: ExerciseLog) {
  return log.sets.reduce<{ weight: number; reps: number } | null>((best, s) => {
    const est = estimateOneRepMax(s.weight, s.reps)
    const bestEst = best ? estimateOneRepMax(best.weight, best.reps) : -1
    return est > bestEst ? s : best
  }, null)
}
