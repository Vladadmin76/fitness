import type { ExerciseLog, WorkoutSession } from '../types'

export interface RepRange {
  low: number
  high: number
}

export const MUSCLE_GROUP_REP_RANGE: RepRange = { low: 8, high: 12 }
export const WEIGHT_LOSS_REP_RANGE: RepRange = { low: 12, high: 20 }
export const WARMUP_REP_RANGE: RepRange = { low: 12, high: 15 }

const GYM_INCREMENT_KG = 2.5

export interface ProgressionTarget {
  weight: number | null
  reps: number
  sets: number
  note: string
}

function lastLogFor(sessions: WorkoutSession[], exerciseId: number): ExerciseLog | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const log = sessions[i].exercises.find((e) => e.exerciseId === exerciseId)
    if (log && log.sets.length > 0) return log
  }
  return null
}

function nextHomeWeight(current: number, availableWeightsKg: number[]): number | null {
  const sorted = [...availableWeightsKg].sort((a, b) => a - b)
  return sorted.find((w) => w > current) ?? null
}

/**
 * Double progression: stay at a weight until every set hits the top of the
 * rep range, then step up the weight and reset reps to the bottom.
 */
export function computeNextTarget(
  sessions: WorkoutSession[],
  exerciseId: number,
  range: RepRange,
  targetSets: number,
  homeAvailableWeightsKg: number[] | null,
): ProgressionTarget {
  const lastLog = lastLogFor(sessions, exerciseId)

  if (!lastLog) {
    return {
      weight: homeAvailableWeightsKg?.[0] ?? null,
      reps: range.low,
      sets: targetSets,
      note: 'Первый раз — выбери комфортный вес и старайся сделать нижнюю границу повторений.',
    }
  }

  const lastWeight = lastLog.sets.at(-1)?.weight ?? 0
  const allSetsHitTop = lastLog.sets.every((s) => s.reps >= range.high)

  if (!allSetsHitTop) {
    return {
      weight: lastWeight,
      reps: range.high,
      sets: targetSets,
      note: 'Держим тот же вес — цель дойти до верхней границы повторений во всех подходах.',
    }
  }

  if (homeAvailableWeightsKg) {
    const next = nextHomeWeight(lastWeight, homeAvailableWeightsKg)
    if (next === null) {
      return {
        weight: lastWeight,
        reps: range.high,
        sets: targetSets + 1,
        note: 'Вес побольше пока недоступен — добавь подход или усложни технику (темп/пауза/одна конечность).',
      }
    }
    return {
      weight: next,
      reps: range.low,
      sets: targetSets,
      note: 'Отличный результат в прошлый раз — берём вес побольше.',
    }
  }

  return {
    weight: lastWeight + GYM_INCREMENT_KG,
    reps: range.low,
    sets: targetSets,
    note: 'Отличный результат в прошлый раз — прибавляем вес.',
  }
}
