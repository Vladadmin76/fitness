export type Goal = 'muscle_group' | 'weight_loss'
export type Location = 'home' | 'gym'

export interface WgerEquipment {
  id: number
  name: string
}

export interface WgerMuscle {
  id: number
  name: string
  name_en: string
  is_front: boolean
  image_url_main: string
  image_url_secondary: string
}

export interface WgerCategory {
  id: number
  name: string
}

export interface WgerExercise {
  id: number
  name: string
  description: string
  category: number
  muscles: number[]
  musclesSecondary: number[]
  equipment: number[]
  images: string[]
  animationFrames: string[] | null
}

export interface UserProfile {
  goal: Goal
  targetMuscleIds: number[]
  location: Location
  homeEquipmentIds: number[]
  homeDumbbellWeightsKg: number[]
}

export interface SetLog {
  weight: number
  reps: number
  completedAt: string
}

export interface ExerciseLog {
  exerciseId: number
  exerciseName: string
  repRangeLow: number
  repRangeHigh: number
  sets: SetLog[]
}

export type SessionKind = 'warmup' | 'workout'

export interface WorkoutSession {
  id: string
  date: string
  goal: Goal
  location: Location
  exercises: ExerciseLog[]
}

export interface PersonalRecord {
  exerciseId: number
  exerciseName: string
  bestWeight: number
  bestReps: number
  estOneRepMax: number
  achievedAt: string
}

export interface PlannedExercise {
  exercise: WgerExercise
  kind: SessionKind
  repRangeLow: number
  repRangeHigh: number
  targetSets: number
  suggestedWeight: number | null
}
