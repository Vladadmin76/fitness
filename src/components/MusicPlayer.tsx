import { useEffect, useRef, useState } from 'react'
import { RADIO_STATIONS } from '../lib/somaFm'
import { fetchWorkoutTracks, isJamendoConfigured, type JamendoTrack } from '../lib/jamendoApi'

type Mode = 'radio' | 'playlist'

export function MusicPlayer() {
  const [mode, setMode] = useState<Mode>('radio')
  const [stationIdx, setStationIdx] = useState(0)
  const [tracks, setTracks] = useState<JamendoTrack[]>([])
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const jamendoReady = isJamendoConfigured()

  useEffect(() => {
    if (mode === 'playlist' && jamendoReady && tracks.length === 0) {
      fetchWorkoutTracks()
        .then(setTracks)
        .catch(() => setError('Не удалось загрузить плейлист Jamendo'))
    }
  }, [mode, jamendoReady, tracks.length])

  const src =
    mode === 'radio' ? RADIO_STATIONS[stationIdx].streamUrl : tracks[trackIdx]?.audioUrl

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !src) return
    audio.src = src
    if (playing) audio.play().catch(() => setError('Не удалось начать воспроизведение'))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the source changes, not on every play/pause toggle
  }, [src])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setError('Не удалось начать воспроизведение'))
    }
  }

  function nextTrack() {
    setTrackIdx((i) => (i + 1) % Math.max(tracks.length, 1))
  }

  return (
    <div className="rounded-lg bg-slate-800 p-3 text-sm">
      <audio
        ref={audioRef}
        onEnded={mode === 'playlist' ? nextTrack : undefined}
      />
      <div className="mb-2 flex gap-2">
        <button
          onClick={() => setMode('radio')}
          className={`rounded px-3 py-1 ${mode === 'radio' ? 'bg-indigo-600' : 'bg-slate-700'}`}
        >
          Радио
        </button>
        <button
          onClick={() => setMode('playlist')}
          className={`rounded px-3 py-1 ${mode === 'playlist' ? 'bg-indigo-600' : 'bg-slate-700'}`}
        >
          Плейлист
        </button>
      </div>

      {mode === 'radio' && (
        <select
          value={stationIdx}
          onChange={(e) => {
            setStationIdx(Number(e.target.value))
            setPlaying(false)
          }}
          className="mb-2 w-full rounded bg-slate-700 px-2 py-1"
        >
          {RADIO_STATIONS.map((s, i) => (
            <option key={s.id} value={i}>
              {s.title} — {s.description}
            </option>
          ))}
        </select>
      )}

      {mode === 'playlist' && !jamendoReady && (
        <p className="mb-2 text-amber-400">
          Добавь бесплатный VITE_JAMENDO_CLIENT_ID в .env (регистрация на devportal.jamendo.com),
          чтобы включить плейлист. Пока доступно только радио.
        </p>
      )}

      {mode === 'playlist' && jamendoReady && tracks[trackIdx] && (
        <p className="mb-2 truncate">
          {tracks[trackIdx].name} — {tracks[trackIdx].artist}
        </p>
      )}

      {error && <p className="mb-2 text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={togglePlay}
          disabled={mode === 'playlist' && !jamendoReady}
          className="rounded bg-slate-700 px-3 py-1 disabled:opacity-40"
        >
          {playing ? 'Пауза' : 'Играть'}
        </button>
        {mode === 'playlist' && jamendoReady && (
          <button onClick={nextTrack} className="rounded bg-slate-700 px-3 py-1">
            Дальше
          </button>
        )}
      </div>
    </div>
  )
}
