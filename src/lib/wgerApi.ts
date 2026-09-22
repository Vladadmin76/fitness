import type { WgerCategory, WgerEquipment, WgerExercise, WgerMuscle } from '../types'
import { findAnimationFrames } from './freeExerciseDb'
import { log } from './log'

const BASE = 'https://wger.de/api/v2'
const LANGUAGE_EN = 2

// free-exercise-db is matched to wger purely by normalized English name, so
// a name that exists in both datasets but means a different movement gets
// silently mismatched. wger's id 1377 "Torso Twist" is a seated Russian
// twist; free-exercise-db's "Torso Twist" is a standing rotation — visibly
// the wrong exercise, so it's better to show no animation at all here.
const BAD_ANIMATION_MATCH_IDS = new Set([1377])

interface WgerImage {
  image: string
  is_main: boolean
}

interface WgerExerciseInfoResult {
  id: number
  category: { id: number; name: string }
  muscles: WgerMuscle[]
  muscles_secondary: WgerMuscle[]
  equipment: { id: number; name: string }[]
  images: WgerImage[]
  translations: { language: number; name: string; description: string }[]
}

async function getJson<T>(url: string): Promise<T> {
  const startedAt = Date.now()
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`wger request failed: ${res.status} ${url}`)
    log('info', `wger запрос за ${Date.now() - startedAt} мс: ${url}`)
    return (await res.json()) as T
  } catch (err) {
    log('error', `wger запрос упал за ${Date.now() - startedAt} мс: ${url} — ${err instanceof Error ? err.message : String(err)}`)
    throw err
  }
}

function cacheKey(name: string): string {
  return `wger.cache.${name}`
}

async function cached<T>(name: string, fetcher: () => Promise<T>): Promise<T> {
  const key = cacheKey(name)
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      return JSON.parse(raw) as T
    } catch {
      // fall through and refetch
    }
  }
  const data = await fetcher()
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // quota exceeded — cache is a convenience, not required
  }
  return data
}

export async function getCategories(): Promise<WgerCategory[]> {
  return cached('categories', async () => {
    const data = await getJson<{ results: WgerCategory[] }>(
      `${BASE}/exercisecategory/?format=json&limit=50`,
    )
    return data.results
  })
}

export async function getEquipment(): Promise<WgerEquipment[]> {
  return cached('equipment', async () => {
    const data = await getJson<{ results: WgerEquipment[] }>(
      `${BASE}/equipment/?format=json&limit=50`,
    )
    return data.results
  })
}

export async function getMuscles(): Promise<WgerMuscle[]> {
  return cached('muscles', async () => {
    const data = await getJson<{ results: WgerMuscle[] }>(
      `${BASE}/muscle/?format=json&limit=50`,
    )
    return data.results
  })
}

function toWgerExercise(r: WgerExerciseInfoResult): WgerExercise | null {
  const translation = r.translations.find((t) => t.language === LANGUAGE_EN) ?? r.translations[0]
  if (!translation || !translation.name) return null
  return {
    id: r.id,
    name: translation.name,
    description: translation.description.replace(/<[^>]+>/g, '').trim(),
    category: r.category?.id,
    muscles: r.muscles.map((m) => m.id),
    musclesSecondary: r.muscles_secondary.map((m) => m.id),
    equipment: r.equipment.map((e) => e.id),
    images: r.images.filter((i) => i.is_main).map((i) => i.image),
    animationFrames: null,
    descriptionIsRussian: false,
  }
}

export interface ExerciseQuery {
  categoryId?: number
  muscleId?: number
  equipmentId?: number
}

const PAGE_SIZE = 250

async function fetchAllPages(url: string): Promise<WgerExerciseInfoResult[]> {
  const results: WgerExerciseInfoResult[] = []
  let next: string | null = url
  while (next) {
    const data: { results: WgerExerciseInfoResult[]; next: string | null } = await getJson(next)
    results.push(...data.results)
    next = data.next
  }
  return results
}

export async function searchExercises(query: ExerciseQuery): Promise<WgerExercise[]> {
  const params = new URLSearchParams({
    format: 'json',
    language: String(LANGUAGE_EN),
    limit: String(PAGE_SIZE),
  })
  if (query.categoryId) params.set('category', String(query.categoryId))
  if (query.muscleId) params.set('muscles', String(query.muscleId))
  if (query.equipmentId) params.set('equipment', String(query.equipmentId))

  const key = `exercises.${params.toString()}`
  return cached(key, async () => {
    // A single muscle group can have 100+ exercises — page through all of
    // them instead of silently truncating to the first request's worth.
    const results = await fetchAllPages(`${BASE}/exerciseinfo/?${params.toString()}`)
    const exercises: WgerExercise[] = []
    for (const r of results) {
      const ex = toWgerExercise(r)
      if (ex) exercises.push(ex)
    }
    await Promise.all(
      exercises.map(async (ex) => {
        ex.animationFrames = BAD_ANIMATION_MATCH_IDS.has(ex.id) ? null : await findAnimationFrames(ex.name)
      }),
    )
    const withAnimation = exercises.filter((ex) => ex.animationFrames !== null).length
    log('info', `Анимация: найдена для ${withAnimation} из ${exercises.length} упражнений (${params.toString()})`)
    return exercises
  })
}

export async function getExercisesByMuscles(muscleIds: number[]): Promise<WgerExercise[]> {
  const lists = await Promise.all(muscleIds.map((id) => searchExercises({ muscleId: id })))
  const byId = new Map<number, WgerExercise>()
  for (const list of lists) {
    for (const ex of list) byId.set(ex.id, ex)
  }
  return [...byId.values()]
}

export async function getExercisesByCategory(categoryId: number): Promise<WgerExercise[]> {
  return searchExercises({ categoryId })
}
