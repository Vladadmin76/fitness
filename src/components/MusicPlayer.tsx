import { useEffect, useRef, useState } from 'react'
import { RADIO_STATIONS } from '../lib/somaFm'
import { fetchWorkoutTracks, isJamendoConfigured, type JamendoTrack } from '../lib/jamendoApi'
import { getLikedTracks, toggleLikedTrack } from '../lib/storage'

type Mode = 'radio' | 'playlist'

export function MusicPlayer() {
  const [mode, setMode] = useState<Mode>('radio')
  const [stationIdx, setStationIdx] = useState(0)
  const [tracks, setTracks] = useState<JamendoTrack[]>([])
  const [likedTracks, setLikedTracks] = useState<JamendoTrack[]>(() => getLikedTracks())
  const [onlyLiked, setOnlyLiked] = useState(false)
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const jamendoReady = isJamendoConfigured()
  const activeList = onlyLiked ? likedTracks : tracks
  const currentTrack = activeList[trackIdx]
  const currentIsLiked = currentTrack ? likedTracks.some((t) => t.id === currentTrack.id) : false

  useEffect(() => {
    if (mode === 'playlist' && jamendoReady && tracks.length === 0) {
      fetchWorkoutTracks()
        .then(setTracks)
        .catch(() => setError('Не удалось загрузить плейлист Jamendo'))
    }
  }, [mode, jamendoReady, tracks.length])

  const src = mode === 'radio' ? RADIO_STATIONS[stationIdx].streamUrl : currentTrack?.audioUrl

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
    setTrackIdx((i) => (i + 1) % Math.max(activeList.length, 1))
  }

  function toggleOnlyLiked() {
    setOnlyLiked((v) => !v)
    setTrackIdx(0)
  }

  function toggleLike() {
    if (!currentTrack) return
    setLikedTracks(toggleLikedTrack(currentTrack))
  }

  return (
    <div className="rounded-lg bg-slate-800 p-3 text-sm">
      <audio ref={audioRef} onEnded={mode === 'playlist' ? nextTrack : undefined} />
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

      {mode === 'playlist' && jamendoReady && (
        <label className="mb-2 flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={onlyLiked} onChange={toggleOnlyLiked} />
          Только избранное ({likedTracks.length})
        </label>
      )}

      {mode === 'playlist' && jamendoReady && onlyLiked && activeList.length === 0 && (
        <p className="mb-2 text-slate-400">Пока нет избранных треков — отметь сердечком то, что понравится.</p>
      )}

      {mode === 'playlist' && jamendoReady && currentTrack && (
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={toggleLike}
            aria-label="Добавить в избранное"
            className={`text-lg leading-none ${currentIsLiked ? 'text-amber-300' : 'text-slate-500'}`}
          >
            ♥
          </button>
          <p className="truncate">
            {currentTrack.name} — {currentTrack.artist}
          </p>
        </div>
      )}

      {error && <p className="mb-2 text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={togglePlay}
          disabled={(mode === 'playlist' && !jamendoReady) || !currentTrack}
          className="rounded bg-slate-700 px-3 py-1 disabled:opacity-40"
        >
          {playing ? 'Пауза' : 'Играть'}
        </button>
        {mode === 'playlist' && jamendoReady && activeList.length > 0 && (
          <button onClick={nextTrack} className="rounded bg-slate-700 px-3 py-1">
            Дальше
          </button>
        )}
      </div>
    </div>
  )
}
