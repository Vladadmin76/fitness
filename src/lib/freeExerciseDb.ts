import { log } from './log'

const DATA_URL = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json'
const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'
const CACHE_KEY = 'freeExerciseDb.index.v2'

interface FreeExercise {
  name: string
  images: string[]
}

let indexPromise: Promise<Map<string, string[]>> | null = null

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((t) => (t.length > 2 && t.endsWith('s') ? t.slice(0, -1) : t))
}

function toKey(tokens: string[]): string {
  return [...new Set(tokens)].sort().join(' ')
}

/**
 * Two variants because compound names hyphenate inconsistently between the
 * two datasets ("Push-Up" vs "Pushups", "Sit-Up" vs "Situp"): one treats
 * hyphens as word breaks, the other joins them so the compound becomes a
 * single token.
 */
function normalizeVariants(name: string): string[] {
  const spaced = toKey(tokenize(name))
  const joined = toKey(tokenize(name.replace(/-/g, '')))
  return spaced === joined ? [spaced] : [spaced, joined]
}

async function buildIndex(): Promise<Map<string, string[]>> {
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) {
    return new Map(JSON.parse(cached) as [string, string[]][])
  }

  const res = await fetch(DATA_URL)
  if (!res.ok) throw new Error(`free-exercise-db request failed: ${res.status}`)
  const data = (await res.json()) as FreeExercise[]

  const index = new Map<string, string[]>()
  for (const ex of data) {
    if (ex.images.length < 2) continue
    const frames = ex.images.slice(0, 2).map((path) => `${IMAGE_BASE}${path}`)
    for (const key of normalizeVariants(ex.name)) {
      if (!index.has(key)) index.set(key, frames)
    }
  }

  log('info', `Анимация: индекс free-exercise-db собран, ${index.size} ключей из ${data.length} упражнений`)

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify([...index.entries()]))
  } catch {
    // cache is a convenience — quota errors just mean rebuilding the index next time
  }
  return index
}

function getIndex(): Promise<Map<string, string[]>> {
  if (!indexPromise) indexPromise = buildIndex().catch((err) => {
    indexPromise = null
    log('error', `Анимация: не удалось собрать индекс free-exercise-db: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  })
  return indexPromise
}

/** Two-frame animation (start/end position) for an exercise, matched by its English name. Null if no confident match exists. */
export async function findAnimationFrames(englishName: string): Promise<string[] | null> {
  try {
    const index = await getIndex()
    for (const key of normalizeVariants(englishName)) {
      const frames = index.get(key)
      if (frames) return frames
    }
    return null
  } catch {
    return null
  }
}
