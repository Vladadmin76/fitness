import type { PlannedExercise, UserProfile, WgerExercise, WorkoutSession } from '../types'
import { getEquipment, getExercisesByCategory, getExercisesByMuscles } from './wgerApi'
import {
  MUSCLE_GROUP_REP_RANGE,
  WARMUP_REP_RANGE,
  WEIGHT_LOSS_REP_RANGE,
  computeNextTarget,
} from './progression'
import { translateExercise } from './translate'

export const BODYWEIGHT_EQUIPMENT_ID = 7
const CARDIO_CATEGORY_ID = 15
const MAIN_MUSCLE_GROUP_EXERCISES = 5
const WEIGHT_LOSS_EXERCISES = 6
const WARMUP_EXERCISES = 3

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

async function allowedEquipmentIds(profile: UserProfile): Promise<Set<number>> {
  if (profile.location === 'home') {
    return new Set([...profile.homeEquipmentIds, BODYWEIGHT_EQUIPMENT_ID])
  }
  const all = await getEquipment()
  return new Set(all.map((e) => e.id))
}

/**
 * wger's crowd-sourced equipment tags are inconsistent: many exercises that
 * genuinely need a machine, a jump rope, or a pool are simply left
 * untagged (empty equipment list), same as exercises that need nothing at
 * all. Treating "untagged" as "usable anywhere" let gym-only equipment
 * leak into home workouts. For home, only exercises with an explicit,
 * fully-covered equipment list (or the bodyweight tag) are allowed; an gym
 * is assumed to have everything, so untagged exercises stay allowed there.
 */
function usableByEquipment(exercise: WgerExercise, allowed: Set<number>, allowUntagged: boolean): boolean {
  if (exercise.equipment.length === 0) return allowUntagged
  return exercise.equipment.every((id) => allowed.has(id))
}

function pickDiverse(exercises: WgerExercise[], count: number): WgerExercise[] {
  const byPrimaryMuscle = new Map<number, WgerExercise[]>()
  for (const ex of exercises) {
    const key = ex.muscles[0] ?? -1
    const list = byPrimaryMuscle.get(key) ?? []
    list.push(ex)
    byPrimaryMuscle.set(key, list)
  }
  const groups = shuffle([...byPrimaryMuscle.values()])
  const picked: WgerExercise[] = []
  let round = 0
  while (picked.length < count && groups.some((g) => g.length > round)) {
    for (const g of groups) {
      if (picked.length >= count) break
      const candidate = shuffle(g)[round]
      if (candidate) picked.push(candidate)
    }
    round++
  }
  return picked
}

async function buildPlanned(
  exercises: WgerExercise[],
  kind: 'warmup' | 'workout',
  repRange: { low: number; high: number },
  targetSets: number,
  sessions: WorkoutSession[],
  homeAvailableWeightsKg: number[] | null,
): Promise<PlannedExercise[]> {
  return Promise.all(
    exercises.map(async (exercise) => {
      const target = computeNextTarget(
        sessions,
        exercise.id,
        repRange,
        targetSets,
        homeAvailableWeightsKg,
      )
      return {
        exercise: await translateExercise(exercise),
        kind,
        repRangeLow: repRange.low,
        repRangeHigh: repRange.high,
        targetSets: target.sets,
        suggestedWeight: target.weight,
      }
    }),
  )
}

export async function generateWorkoutPlan(
  profile: UserProfile,
  sessions: WorkoutSession[],
): Promise<{ warmup: PlannedExercise[]; workout: PlannedExercise[] }> {
  const allowed = await allowedEquipmentIds(profile)
  const allowUntagged = profile.location === 'gym'
  const homeWeights = profile.location === 'home' ? profile.homeDumbbellWeightsKg : null

  if (profile.goal === 'muscle_group') {
    const candidates = await getExercisesByMuscles(profile.targetMuscleIds)
    const usable = candidates.filter((ex) => usableByEquipment(ex, allowed, allowUntagged))
    const main = pickDiverse(usable, MAIN_MUSCLE_GROUP_EXERCISES)
    const warmupPool = usable.filter((ex) => !main.includes(ex))
    const warmup = pickDiverse(warmupPool.length ? warmupPool : usable, WARMUP_EXERCISES)

    return {
      warmup: await buildPlanned(warmup, 'warmup', WARMUP_REP_RANGE, 1, sessions, homeWeights),
      workout: await buildPlanned(main, 'workout', MUSCLE_GROUP_REP_RANGE, 3, sessions, homeWeights),
    }
  }

  // weight_loss: full-body circuit spread across categories, plus cardio for warm-up
  const cardio = (await getExercisesByCategory(CARDIO_CATEGORY_ID)).filter((ex) =>
    usableByEquipment(ex, allowed, allowUntagged),
  )
  const allExercises = await getExercisesByMuscles(profile.targetMuscleIds)
  const usable = allExercises.filter((ex) => usableByEquipment(ex, allowed, allowUntagged))
  const main = pickDiverse(usable, WEIGHT_LOSS_EXERCISES)
  const warmup = pickDiverse(cardio.length ? cardio : usable, WARMUP_EXERCISES)

  return {
    warmup: await buildPlanned(warmup, 'warmup', WARMUP_REP_RANGE, 1, sessions, homeWeights),
    workout: await buildPlanned(main, 'workout', WEIGHT_LOSS_REP_RANGE, 3, sessions, homeWeights),
  }
}
