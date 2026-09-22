import type { PlannedExercise, UserProfile, WgerExercise, WorkoutSession } from '../types'
import { getEquipment, getExercisesByCategory, getExercisesByMuscles } from './wgerApi'
import {
  MUSCLE_GROUP_REP_RANGE,
  WARMUP_REP_RANGE,
  WEIGHT_LOSS_REP_RANGE,
  computeNextTarget,
} from './progression'
import { resolveExerciseText } from './translate'
import { log } from './log'

export const BODYWEIGHT_EQUIPMENT_ID = 7
const CARDIO_CATEGORY_ID = 15
const MAIN_MUSCLE_GROUP_EXERCISES = 5
const WEIGHT_LOSS_EXERCISES = 6
const WARMUP_EXERCISES = 3

// wger has no equipment category for a TRX/suspension trainer, so these
// exercises get mistagged as "none (bodyweight exercise)" even though they
// need suspension straps most people don't own. Since there's no home
// checkbox for it either, treat them as needing equipment nobody has.
const TRX_EXERCISE_IDS = new Set([674, 927, 958, 959, 1246, 1259, 1260, 1261, 1262, 1266, 1269])

// Same problem for a whole other category: wger's "equipment" only tracks
// traditional strength gear, so outdoor running/walking, swimming, and
// cardio machines (treadmill, stationary bike, rower, elliptical, stair
// climber, ski erg) all get tagged "none (bodyweight exercise)" too — even
// though none of them are actually doable in a room with no equipment.
const NEEDS_SPACE_OR_MACHINE_IDS = new Set([
  319, 527, 529, 530, 908, // running/jogging outdoors or on a treadmill
  961, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487, // swimming
  624, 962, 1093, 1376, 1449, 1526, 1548, 1615, 1618, 2549, // cardio machines
  1104, // "Walking" (as opposed to marching/jogging in place)
])
const UNAVAILABLE_EQUIPMENT_ID = -1

function correctedEquipment(exercise: WgerExercise): number[] {
  if (TRX_EXERCISE_IDS.has(exercise.id) || NEEDS_SPACE_OR_MACHINE_IDS.has(exercise.id)) {
    return [UNAVAILABLE_EQUIPMENT_ID]
  }
  return exercise.equipment
}

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
  const equipment = correctedEquipment(exercise)
  if (equipment.length === 0) return allowUntagged
  return equipment.every((id) => allowed.has(id))
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
        exercise: resolveExerciseText(exercise),
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
  const startedAt = Date.now()
  log('info', `Генерация тренировки: цель=${profile.goal}, место=${profile.location}`)
  try {
    const allowed = await allowedEquipmentIds(profile)
    const allowUntagged = profile.location === 'gym'
    const homeWeights = profile.location === 'home' ? profile.homeDumbbellWeightsKg : null

    let result: { warmup: PlannedExercise[]; workout: PlannedExercise[] }

    if (profile.goal === 'muscle_group') {
      const candidates = await getExercisesByMuscles(profile.targetMuscleIds)
      const usable = candidates.filter((ex) => usableByEquipment(ex, allowed, allowUntagged))
      log('info', `Кандидатов: ${candidates.length}, подходит по инвентарю: ${usable.length}`)
      const main = pickDiverse(usable, MAIN_MUSCLE_GROUP_EXERCISES)
      const warmupPool = usable.filter((ex) => !main.includes(ex))
      const warmup = pickDiverse(warmupPool.length ? warmupPool : usable, WARMUP_EXERCISES)

      result = {
        warmup: await buildPlanned(warmup, 'warmup', WARMUP_REP_RANGE, 1, sessions, homeWeights),
        workout: await buildPlanned(main, 'workout', MUSCLE_GROUP_REP_RANGE, 3, sessions, homeWeights),
      }
    } else {
      // weight_loss: full-body circuit spread across categories, plus cardio for warm-up
      const cardio = (await getExercisesByCategory(CARDIO_CATEGORY_ID)).filter((ex) =>
        usableByEquipment(ex, allowed, allowUntagged),
      )
      const allExercises = await getExercisesByMuscles(profile.targetMuscleIds)
      const usable = allExercises.filter((ex) => usableByEquipment(ex, allowed, allowUntagged))
      log('info', `Кандидатов: ${allExercises.length}, подходит по инвентарю: ${usable.length}, кардио для разминки: ${cardio.length}`)
      const main = pickDiverse(usable, WEIGHT_LOSS_EXERCISES)
      const warmup = pickDiverse(cardio.length ? cardio : usable, WARMUP_EXERCISES)

      result = {
        warmup: await buildPlanned(warmup, 'warmup', WARMUP_REP_RANGE, 1, sessions, homeWeights),
        workout: await buildPlanned(main, 'workout', WEIGHT_LOSS_REP_RANGE, 3, sessions, homeWeights),
      }
    }

    log('info', `Тренировка собрана за ${Date.now() - startedAt} мс (разминка: ${result.warmup.length}, основная: ${result.workout.length})`)
    return result
  } catch (err) {
    log('error', `Ошибка генерации тренировки за ${Date.now() - startedAt} мс: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  }
}
