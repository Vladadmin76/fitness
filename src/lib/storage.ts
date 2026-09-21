import type { PersonalRecord, UserProfile, WorkoutSession } from '../types'

const KEYS = {
  profile: 'fitness.profile',
  sessions: 'fitness.sessions',
  prs: 'fitness.prs',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode, quota) — app continues without persistence
  }
}

export function getProfile(): UserProfile | null {
  return read<UserProfile | null>(KEYS.profile, null)
}

export function saveProfile(profile: UserProfile): void {
  write(KEYS.profile, profile)
}

export function getSessions(): WorkoutSession[] {
  return read<WorkoutSession[]>(KEYS.sessions, [])
}

export function addSession(session: WorkoutSession): void {
  const sessions = getSessions()
  sessions.push(session)
  write(KEYS.sessions, sessions)
}

export function getExerciseHistory(exerciseId: number): WorkoutSession[] {
  return getSessions().filter((s) =>
    s.exercises.some((e) => e.exerciseId === exerciseId),
  )
}

export function getPRs(): PersonalRecord[] {
  return read<PersonalRecord[]>(KEYS.prs, [])
}

export function savePRs(prs: PersonalRecord[]): void {
  write(KEYS.prs, prs)
}
