export interface RadioStation {
  id: string
  title: string
  description: string
  streamUrl: string
}

// Curated for workout energy (upbeat electronic/dance). Free, no API key, no CORS restriction.
export const RADIO_STATIONS: RadioStation[] = [
  { id: 'beatblender', title: 'Beat Blender', description: 'Deep house, downtempo grooves', streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3' },
  { id: 'dubstep', title: 'Dub Step Beyond', description: 'Dubstep, dub, and deep bass', streamUrl: 'https://ice1.somafm.com/dubstep-128-mp3' },
  { id: 'thetrip', title: 'The Trip', description: 'Progressive house / trance', streamUrl: 'https://ice1.somafm.com/thetrip-128-mp3' },
  { id: 'u80s', title: 'Underground 80s', description: 'Energetic 80s new wave', streamUrl: 'https://ice1.somafm.com/u80s-128-mp3' },
  { id: 'lush', title: 'Lush', description: 'Sensuous electronica', streamUrl: 'https://ice1.somafm.com/lush-128-mp3' },
]
