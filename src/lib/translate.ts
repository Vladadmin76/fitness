import type { WgerExercise } from '../types'

const API = 'https://api.mymemory.translated.net/get'
const MAX_CHUNK_CHARS = 480
const MAX_CONCURRENT_REQUESTS = 2

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
    try {
      return await requestTranslation(text)
    } catch {
      // one retry after a short backoff — anonymous free-tier requests
      // occasionally get rate-limited under bursts
      await new Promise((resolve) => setTimeout(resolve, 400))
      return await requestTranslation(text)
    }
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

export async function translateExercise(exercise: WgerExercise): Promise<WgerExercise> {
  const [name, description] = await Promise.all([
    translateToRussian(exercise.name),
    translateToRussian(exercise.description),
  ])
  return { ...exercise, name, description }
}
