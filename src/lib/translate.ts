import type { WgerExercise } from '../types'
import { EXERCISE_NAME_RU } from './exerciseNamesRu'
import { EXERCISE_DESCRIPTION_RU } from './exerciseDescriptionsRu'

const API = 'https://api.mymemory.translated.net/get'
const MAX_CHUNK_CHARS = 480
const MAX_CONCURRENT_REQUESTS = 1
const RETRY_DELAYS_MS = [500, 1200, 2500]

let activeRequests = 0
const waitQueue: (() => void)[] = []

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => waitQueue.push(resolve))
  }
  activeRequests++
  try {
    return await fn()
  } finally {
    activeRequests--
    waitQueue.shift()?.()
  }
}

function cacheKey(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return `translate.ru.${hash}`
}

function splitIntoChunks(text: string, max = MAX_CHUNK_CHARS): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length > max) {
      if (current) chunks.push(current)
      current = sentence.length > max ? sentence.slice(0, max) : sentence
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  return chunks
}

async function requestTranslation(text: string): Promise<string> {
  const params = new URLSearchParams({ q: text, langpair: 'en|ru' })
  const res = await fetch(`${API}?${params.toString()}`)
  if (!res.ok) throw new Error(`translation request failed: ${res.status}`)
  const data = (await res.json()) as { responseData?: { translatedText?: string } }
  return data.responseData?.translatedText ?? text
}

async function translateChunk(text: string): Promise<string> {
  return withConcurrencyLimit(async () => {
    // Anonymous free-tier requests get rate-limited fairly often under
    // real traffic (shared quota across everyone hitting the API without a
    // key), so retry with increasing backoff before giving up and falling
    // back to the original English text.
    for (const delay of RETRY_DELAYS_MS) {
      try {
        return await requestTranslation(text)
      } catch {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    return requestTranslation(text)
  })
}

/** Translates English text to Russian via the free MyMemory API, caching results forever. */
export async function translateToRussian(text: string): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return text

  const key = cacheKey(trimmed)
  const cached = localStorage.getItem(key)
  if (cached !== null) return cached

  try {
    const chunks = splitIntoChunks(trimmed)
    const translated: string[] = []
    for (const chunk of chunks) {
      translated.push(await translateChunk(chunk))
    }
    const result = translated.join(' ')
    try {
      localStorage.setItem(key, result)
    } catch {
      // cache is a convenience — quota errors just mean re-translating next time
    }
    return result
  } catch {
    return text
  }
}

/**
 * Exercise names use a hand-translated dictionary (wger's database is
 * effectively English-only, and machine translation mangles gym
 * terminology — e.g. turning "fingerboard" into something about
 * fingerprints). Descriptions are longer free-text prose without a
 * practical way to hand-translate all of them, so most still go through
 * the automatic translator — except a growing set of common exercises
 * whose source text is vague marketing copy rather than real technique,
 * which get a hand-written description instead.
 */
export async function translateExercise(exercise: WgerExercise): Promise<WgerExercise> {
  const manualName = EXERCISE_NAME_RU[exercise.id]
  const manualDescription = EXERCISE_DESCRIPTION_RU[exercise.id]
  const [name, description] = await Promise.all([
    manualName ? Promise.resolve(manualName) : translateToRussian(exercise.name),
    manualDescription ? Promise.resolve(manualDescription) : translateToRussian(exercise.description),
  ])
  return { ...exercise, name, description }
}
