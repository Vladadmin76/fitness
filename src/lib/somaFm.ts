export interface RadioStation {
  id: string
  title: string
  description: string
  streamUrl: string
}

// Curated for workout energy (upbeat electronic/dance). Free, no API key, no CORS restriction.
export const RADIO_STATIONS: RadioStation[] = [
  { id: 'beatblender', title: 'Beat Blender', description: 'Дип-хаус, размеренный ритм', streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3' },
  { id: 'dubstep', title: 'Dub Step Beyond', description: 'Дабстеп и тяжёлый бас', streamUrl: 'https://ice1.somafm.com/dubstep-128-mp3' },
  { id: 'thetrip', title: 'The Trip', description: 'Прогрессив-хаус / транс', streamUrl: 'https://ice1.somafm.com/thetrip-128-mp3' },
  { id: 'u80s', title: 'Underground 80s', description: 'Энергичная музыка в стиле 80-х', streamUrl: 'https://ice1.somafm.com/u80s-128-mp3' },
  { id: 'lush', title: 'Lush', description: 'Мелодичная электроника', streamUrl: 'https://ice1.somafm.com/lush-128-mp3' },
]
