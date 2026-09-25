#!/usr/bin/env node
/**
 * Fails when the production bundle exceeds the budgets in SPECIFICATION.md:
 * JS < 100 KB gzipped, CSS < 20 KB gzipped, total initial load < 400 KB.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dir = process.argv[2] ?? 'dist/assets'
const BUDGETS = { js: 100 * 1024, css: 20 * 1024, total: 400 * 1024 }

const totals = { js: 0, css: 0, other: 0 }
for (const file of readdirSync(dir)) {
  if (file.endsWith('.map')) continue
  const path = join(dir, file)
  const ext = file.split('.').pop()
  if (ext === 'js' || ext === 'css') totals[ext] += gzipSync(readFileSync(path)).length
  else totals.other += statSync(path).size
}
const total = totals.js + totals.css + totals.other
const kb = (n) => `${(n / 1024).toFixed(1)} KB`

console.log(`JS (gzip):  ${kb(totals.js)} / ${kb(BUDGETS.js)}`)
console.log(`CSS (gzip): ${kb(totals.css)} / ${kb(BUDGETS.css)}`)
console.log(`Total:      ${kb(total)} / ${kb(BUDGETS.total)} (audio included)`)

const failures = [
  totals.js > BUDGETS.js && 'JavaScript',
  totals.css > BUDGETS.css && 'CSS',
  total > BUDGETS.total && 'total',
].filter(Boolean)
if (failures.length) {
  console.error(`Bundle budget exceeded: ${failures.join(', ')}`)
  process.exit(1)
}
