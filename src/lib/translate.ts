import type { WgerExercise } from '../types'
import { EXERCISE_NAME_RU } from './exerciseNamesRu'
import { EXERCISE_DESCRIPTION_RU } from './exerciseDescriptionsRu'
import { log } from './log'

const API = 'https://api.mymemory.translated.net/get'
const MAX_CHUNK_CHARS = 480
const MAX_CONCURRENT_REQUESTS = 2
const RETRY_DELAYS_MS = [300, 800]

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

  const startedAt = Date.now()
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
    log('info', `Перевод (${chunks.length} фрагм., ${Date.now() - startedAt} мс): "${trimmed.slice(0, 40)}…"`)
    return result
  } catch (err) {
    log('warn', `Перевод не удался за ${Date.now() - startedAt} мс, оставляю английский: "${trimmed.slice(0, 40)}…" — ${err instanceof Error ? err.message : String(err)}`)
    return text
  }
}

/**
 * Exercise names use a hand-translated dictionary covering all of wger's
 * exercises (machine translation mangles gym terminology — e.g. turning
 * "fingerboard" into something about fingerprints), so this is instant and
 * needs no network call. Descriptions are longer free-text prose without a
 * practical way to hand-translate all of them: a growing set of common
 * exercises get a hand-written description, but the rest keep their raw
 * English here and are translated lazily (see `translateToRussian`) only
 * when the player actually opens the technique text — translating all of
 * them upfront made workout generation itself wait on a slow, often
 * rate-limited third-party API.
 */
export function resolveExerciseText(exercise: WgerExercise): WgerExercise {
  const manualDescription = EXERCISE_DESCRIPTION_RU[exercise.id]
  return {
    ...exercise,
    name: EXERCISE_NAME_RU[exercise.id] ?? exercise.name,
    description: manualDescription ?? exercise.description,
    descriptionIsRussian: manualDescription !== undefined,
  }
}
