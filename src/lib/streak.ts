import type { WorkoutSession } from '../types'

function toDayKey(iso: string): string {
  return iso.slice(0, 10)
}

/** Consecutive days up to and including today/yesterday that have a logged session. */
export function computeStreak(sessions: WorkoutSession[]): number {
  const days = new Set(sessions.map((s) => toDayKey(s.date)))
  if (days.size === 0) return 0

  const cursor = new Date()
  let streak = 0

  if (!days.has(toDayKey(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(toDayKey(cursor.toISOString()))) return 0
  }

  while (days.has(toDayKey(cursor.toISOString()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function sessionsThisWeek(sessions: WorkoutSession[]): number {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return sessions.filter((s) => new Date(s.date) >= startOfWeek).length
}
