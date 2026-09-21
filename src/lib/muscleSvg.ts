const CACHE_PREFIX = 'muscleSvg.'
const memoryCache = new Map<string, string>()

/**
 * wger's muscle overlay SVGs draw a plain shape with no fill attribute
 * (defaults to black) meant to be recolored by whoever embeds it. CSS
 * `mask-image` can do that, but browsers disagree on whether an external
 * SVG mask defaults to alpha or luminance mode — on some (notably iOS
 * Safari) a solid black shape under luminance masking renders as fully
 * invisible, which is exactly the "nothing highlighted" bug. Fetching the
 * SVG and setting `fill` directly sidesteps that inconsistency entirely.
 */
export async function fetchColoredMuscleSvg(url: string, color: string): Promise<string | null> {
  const key = `${url}::${color}`
  const inMemory = memoryCache.get(key)
  if (inMemory) return inMemory

  const cacheKey = CACHE_PREFIX + key
  const cached = localStorage.getItem(cacheKey)
  if (cached !== null) {
    memoryCache.set(key, cached)
    return cached
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    let svg = await res.text()
    svg = svg
      .replace(/<svg\b/, `<svg fill="${color}"`)
      .replace(/\swidth="[^"]*"/, ' width="100%"')
      .replace(/\sheight="[^"]*"/, ' height="100%"')

    memoryCache.set(key, svg)
    try {
      localStorage.setItem(cacheKey, svg)
    } catch {
      // cache is a convenience — quota errors just mean refetching next time
    }
    return svg
  } catch {
    return null
  }
}
