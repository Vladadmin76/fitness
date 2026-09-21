export interface JamendoTrack {
  id: string
  name: string
  artist: string
  audioUrl: string
}

export class JamendoNotConfiguredError extends Error {
  constructor() {
    super('Jamendo client_id is not configured')
    this.name = 'JamendoNotConfiguredError'
  }
}

function getClientId(): string {
  const id = import.meta.env.VITE_JAMENDO_CLIENT_ID as string | undefined
  if (!id) throw new JamendoNotConfiguredError()
  return id
}

export function isJamendoConfigured(): boolean {
  return Boolean(import.meta.env.VITE_JAMENDO_CLIENT_ID)
}

export async function fetchWorkoutTracks(limit = 20): Promise<JamendoTrack[]> {
  const clientId = getClientId()
  const params = new URLSearchParams({
    client_id: clientId,
    format: 'json',
    limit: String(limit),
    tags: 'energetic+workout+dance+electronic',
    include: 'musicinfo',
    audioformat: 'mp32',
    boost: 'popularity_month',
  })
  const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`)
  if (!res.ok) throw new Error(`Jamendo request failed: ${res.status}`)
  const data = (await res.json()) as {
    results: { id: string; name: string; artist_name: string; audio: string }[]
  }
  return data.results.map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artist_name,
    audioUrl: t.audio,
  }))
}
