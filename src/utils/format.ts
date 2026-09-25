/** Formats milliseconds as `m:ss` or `h:mm:ss`. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`
  return `${String(minutes).padStart(2, '0')}:${ss}`
}

/** Formats milliseconds for screen readers, e.g. "1 minute 5 seconds". */
export function formatDurationSpoken(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (hours) parts.push(plural(hours, 'hour'))
  if (minutes) parts.push(plural(minutes, 'minute'))
  if (seconds || parts.length === 0) parts.push(plural(seconds, 'second'))
  return parts.join(' ')
}

/** `1 move`, `2 moves`. */
export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** Formats a 0–1 ratio as a whole percentage. */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}
