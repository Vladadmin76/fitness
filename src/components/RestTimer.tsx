import { useEffect, useRef, useState } from 'react'

const DEFAULT_SECONDS = 90

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // audio unavailable — silent rest timer still works visually
  }
}

interface Props {
  onDone?: () => void
  autoStart?: boolean
}

export function RestTimer({ onDone, autoStart }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(autoStart ? DEFAULT_SECONDS : null)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (secondsLeft === null) return
    if (secondsLeft <= 0) {
      playBeep()
      doneRef.current?.()
      return
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft])

  if (secondsLeft === null) {
    return (
      <button
        onClick={() => setSecondsLeft(DEFAULT_SECONDS)}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600"
      >
        Начать отдых
      </button>
    )
  }

  const mm = Math.floor(secondsLeft / 60)
  const ss = secondsLeft % 60

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-2">
      <span className="w-14 font-mono text-lg tabular-nums">
        {mm}:{ss.toString().padStart(2, '0')}
      </span>
      <button
        onClick={() => setSecondsLeft((s) => Math.max(0, (s ?? 0) - 15))}
        className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
      >
        −15с
      </button>
      <button
        onClick={() => setSecondsLeft((s) => (s ?? 0) + 15)}
        className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
      >
        +15с
      </button>
      <button
        onClick={() => setSecondsLeft(null)}
        className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
      >
        Пропустить
      </button>
    </div>
  )
}
