/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When `true`, test hooks are exposed on `window.__solitaire` (E2E builds only). */
  readonly VITE_E2E?: string
  /** Optional Sentry DSN; enables the remote error reporter when present. */
  readonly VITE_SENTRY_DSN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
