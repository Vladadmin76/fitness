import type { WgerCategory, WgerEquipment, WgerExercise, WgerMuscle } from '../types'

const BASE = 'https://wger.de/api/v2'
const LANGUAGE_EN = 2

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
  const res = await fetch(url)
  if (!res.ok) throw new Error(`wger request failed: ${res.status} ${url}`)
  return res.json() as Promise<T>
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
  }
}

export interface ExerciseQuery {
  categoryId?: number
  muscleId?: number
  equipmentId?: number
  limit?: number
}

export async function searchExercises(query: ExerciseQuery): Promise<WgerExercise[]> {
  const params = new URLSearchParams({
    format: 'json',
    language: String(LANGUAGE_EN),
    limit: String(query.limit ?? 60),
  })
  if (query.categoryId) params.set('category', String(query.categoryId))
  if (query.muscleId) params.set('muscles', String(query.muscleId))
  if (query.equipmentId) params.set('equipment', String(query.equipmentId))

  const key = `exercises.${params.toString()}`
  return cached(key, async () => {
    const data = await getJson<{ results: WgerExerciseInfoResult[] }>(
      `${BASE}/exerciseinfo/?${params.toString()}`,
    )
    const exercises: WgerExercise[] = []
    for (const r of data.results) {
      const ex = toWgerExercise(r)
      if (ex) exercises.push(ex)
    }
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
