export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  time: string
  level: LogLevel
  message: string
}

const STORAGE_KEY = 'fitness.debugLog'
const MAX_ENTRIES = 300

function readAll(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LogEntry[]) : []
  } catch {
    return []
  }
}

function writeAll(entries: LogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    // storage full — dropping log history is fine, it's a diagnostic aid, not app state
  }
}

export function log(level: LogLevel, message: string): void {
  const entry: LogEntry = { time: new Date().toISOString(), level, message }
  writeAll([...readAll(), entry])
}

export function getLogs(): LogEntry[] {
  return readAll()
}

export function clearLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to do if storage is unavailable
  }
}

export function formatLogsForCopy(entries: LogEntry[]): string {
  return entries
    .map((e) => `[${e.time}] ${e.level.toUpperCase()}: ${e.message}`)
    .join('\n')
}
