import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clearLogs, formatLogsForCopy, getLogs, type LogEntry } from '../lib/log'
import { isGithubLoggingConfigured, sendLogToGitHub } from '../lib/githubLog'

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  info: 'text-slate-300',
  warn: 'text-amber-400',
  error: 'text-red-400',
}

type SendState = 'idle' | 'sending' | 'sent' | 'error'

export function DebugLog() {
  const [entries, setEntries] = useState(() => [...getLogs()].reverse())
  const [copied, setCopied] = useState(false)
  const [sendState, setSendState] = useState<SendState>('idle')
  const [sendError, setSendError] = useState('')

  const githubReady = isGithubLoggingConfigured()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatLogsForCopy(getLogs()))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — nothing more we can do here
    }
  }

  function handleClear() {
    clearLogs()
    setEntries([])
  }

  async function handleSendToGithub() {
    setSendState('sending')
    try {
      await sendLogToGitHub(formatLogsForCopy(getLogs()))
      setSendState('sent')
      setTimeout(() => setSendState('idle'), 3000)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err))
      setSendState('error')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Технический журнал</h1>
      <p className="text-sm text-slate-400">
        Здесь фиксируется, сколько времени занимают запросы к серверам и перевод, и что идёт не
        так. Полезно прислать при жалобе на медленную работу или ошибку.
      </p>

      <div className="flex flex-wrap gap-3">
        <button onClick={handleCopy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">
          {copied ? 'Скопировано!' : 'Скопировать всё'}
        </button>
        {githubReady && (
          <button
            onClick={handleSendToGithub}
            disabled={sendState === 'sending'}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {sendState === 'sending' && 'Отправляю…'}
            {sendState === 'sent' && 'Отправлено!'}
            {(sendState === 'idle' || sendState === 'error') && 'Отправить в GitHub'}
          </button>
        )}
        <button onClick={handleClear} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600">
          Очистить
        </button>
        <Link to="/settings" className="ml-auto self-center text-sm text-slate-400 underline">
          назад
        </Link>
      </div>

      {sendState === 'error' && (
        <p className="text-sm text-red-400">Не получилось отправить: {sendError}</p>
      )}

      {entries.length === 0 && <p className="text-sm text-slate-400">Журнал пуст.</p>}

      <ul className="space-y-1 font-mono text-xs">
        {entries.map((e, i) => (
          <li key={i} className="rounded bg-slate-800/60 px-2 py-1">
            <span className="text-slate-500">{new Date(e.time).toLocaleTimeString('ru-RU')}</span>{' '}
            <span className={LEVEL_COLOR[e.level]}>{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
