const OWNER = 'Vladadmin76'
const REPO = 'fitness'

export function isGithubLoggingConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GITHUB_LOG_TOKEN)
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function timestampedPath(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `logs/${stamp}.log`
}

/** Commits the given text as a new file under logs/ in the repo, using a token scoped to this repo only. */
export async function sendLogToGitHub(content: string): Promise<void> {
  const token = import.meta.env.VITE_GITHUB_LOG_TOKEN
  if (!token) throw new Error('VITE_GITHUB_LOG_TOKEN не настроен')

  const path = timestampedPath()
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Лог из приложения (${new Date().toLocaleString('ru-RU')})`,
      content: utf8ToBase64(content),
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${errText.slice(0, 200)}`)
  }
}
