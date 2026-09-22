/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JAMENDO_CLIENT_ID?: string
  readonly VITE_GITHUB_LOG_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
