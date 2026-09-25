import type { App } from 'vue'

/** Receives uncaught errors. Register e.g. a Sentry adapter with {@link registerErrorReporter}. */
export type ErrorReporter = (error: unknown, context: { source: string; info?: string }) => void

const reporters = new Set<ErrorReporter>()

const consoleReporter: ErrorReporter = (error, { source, info }) => {
  console.error(`[solitaire] ${source}${info ? ` (${info})` : ''}:`, error)
}

/** Adds a reporter; returns a function that removes it. */
export function registerErrorReporter(reporter: ErrorReporter): () => void {
  reporters.add(reporter)
  return () => reporters.delete(reporter)
}

/** Sends an error to every registered reporter (and the console). Never throws. */
export function reportError(error: unknown, context: { source: string; info?: string }): void {
  for (const reporter of [consoleReporter, ...reporters]) {
    try {
      reporter(error, context)
    } catch {
      // A failing reporter must never break the app.
    }
  }
}

/**
 * Installs global error handling for the Vue app and the window.
 *
 * To enable Sentry, install `@sentry/vue`, set `VITE_SENTRY_DSN`, and
 * register an adapter: `registerErrorReporter((e) => Sentry.captureException(e))`.
 */
export function installErrorHandling(app: App, target: Window = window): void {
  app.config.errorHandler = (error, _instance, info) => reportError(error, { source: 'vue', info })
  target.addEventListener('error', (event) =>
    reportError(event.error ?? event.message, { source: 'window' }),
  )
  target.addEventListener('unhandledrejection', (event) =>
    reportError(event.reason, { source: 'unhandledrejection' }),
  )
}
