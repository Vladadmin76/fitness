import type { WgerExercise } from '../types'
import { getExercisesByMuscles } from './wgerApi'
import { resolveExerciseText } from './translate'

/** Alternatives that hit the same primary muscle but rely on different equipment. */
export async function findAlternatives(
  exercise: WgerExercise,
  unavailableEquipmentId?: number,
): Promise<WgerExercise[]> {
  const candidates = await getExercisesByMuscles(exercise.muscles.slice(0, 1))

  const top = candidates
    .filter((ex) => ex.id !== exercise.id)
    .filter((ex) => !unavailableEquipmentId || !ex.equipment.includes(unavailableEquipmentId))
    .sort((a, b) => overlapScore(b, exercise) - overlapScore(a, exercise))
    .slice(0, 5)

  return top.map(resolveExerciseText)
}

function overlapScore(candidate: WgerExercise, original: WgerExercise): number {
  const originalMuscles = new Set([...original.muscles, ...original.musclesSecondary])
  const candidateMuscles = [...candidate.muscles, ...candidate.musclesSecondary]
  return candidateMuscles.filter((m) => originalMuscles.has(m)).length
}
