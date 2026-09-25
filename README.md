# Klondike Solitaire

The classic patience card game, rebuilt as a modern **Vue 3 + TypeScript** application.
This project implements [`SPECIFICATION.md`](./SPECIFICATION.md): it replaces the
original 2015 Aurelia demo with a framework-agnostic game engine, Pinia state,
accessible UI and a full test pyramid.

- Drag-and-drop (mouse, touch, pen), tap-to-move and full keyboard play
- Draw one or draw three, unlimited passes through the stock
- Double-click to send a card to its foundation; one-click auto-complete
- Unlimited undo/redo (Ctrl+Z / Ctrl+Y), hints (H) with optional limits
- Timer, move counter, statistics (win rate, best time, fewest moves, streaks)
- Classic, dark and high-contrast themes, four card backs, sound with volume
- Game auto-saved and resumed on reload; reproducible deals via `?seed=1234`
- WCAG 2.1 AA: screen-reader announcements, visible focus, reduced motion,
  forced-colours support

See the [user guide](./docs/USER_GUIDE.md) for how to play.

## Getting started

Requires Node.js 20+ (22 recommended).

```sh
npm install
npm run dev          # http://localhost:5173
```

| Script                  | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev`           | Vite dev server with HMR                                        |
| `npm run build`         | Type-check and build to `dist/`                                 |
| `npm run preview`       | Serve the production build                                      |
| `npm run lint`          | ESLint (Vue, TypeScript, accessibility)                         |
| `npm run format`        | Prettier                                                        |
| `npm run type-check`    | `vue-tsc` across app, tests and config                          |
| `npm run test:unit`     | Vitest unit and component tests                                 |
| `npm run test:coverage` | Unit tests with enforced coverage thresholds                    |
| `npm run test:e2e`      | Playwright E2E + axe accessibility tests (builds an E2E bundle) |
| `npm run size`          | Check the bundle against the size budget                        |
| `npm run docs`          | Generate API docs for the engine with TypeDoc (`docs/api`)      |
| `npm run ci`            | Everything CI runs except E2E                                   |

## Architecture

```
src/
├── domain/        Framework-agnostic engine (no Vue imports)
│   ├── types/       Suit, Rank, PileType/PileLocation, Move
│   ├── models/      Card (immutable), Pile helpers, GameState (immutable snapshot)
│   ├── services/    KlondikeRules, MoveValidator, Dealer, GameEngine, HintService, Serializer
│   ├── commands/    Command, MoveCommand, CommandHistory (undo/redo)
│   └── builders/    GameBuilder
├── stores/        Pinia: gameStore, settingsStore, statsStore, uiStore
├── composables/   useDragDrop, useCardAnimations, useBoardController, useBoardNavigation,
│                  useKeyboardShortcuts, useGameFeedback, useAnnouncer, useAudio,
│                  useTheme, useTimer, useStatistics, useGameRules
├── components/    cards/, piles/, game/, modals/, ui/
├── utils/         shuffle, random (crypto + seeded), storage (versioned, validated), eventBus,
│                  errorReporter, format
└── testing/       Fixtures shared by unit tests and the E2E test hooks
```

**Layers.** Components render state and forward intent to `useBoardController`,
which calls store actions. The `gameStore` owns the session (current table,
history, timer, hints, persistence) but delegates every rule to the domain
engine, whose functions are pure: each action returns a new, immutable
`GameState`. Undo/redo therefore stores snapshots (`MoveCommand`) with no
copying, and snapshots serialise safely to `localStorage`.

**Patterns.** Strategy (`SolitaireRules` / `KlondikeRules`), Command
(`MoveCommand` + `CommandHistory`), Builder (`GameBuilder`), Observer (typed
`eventBus`; the store publishes `cards:moved`, `game:won`, … which drive
sound, announcements and animations), Repository (Pinia stores over
versioned storage).

**State integrity.** Cards are frozen flyweights; state is exposed through
read-only computed refs; everything read from storage is schema-validated
(52 unique cards, pile orientation, ordered foundations) and falls back to a
backup copy or defaults.

### Deliberate deviations from the specification

| Spec suggestion                    | Implementation                    | Why                                                                                                                                                         |
| ---------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VueDraggable Plus, @vueuse/gesture | Pointer-events `useDragDrop`      | Sortable-list libraries don't fit rule-validated pile drops; @vueuse/gesture is unmaintained. Pointer events cover mouse, touch and pen with one code path. |
| `draggable="true"` on cards        | `data-draggable` + pointer events | Native HTML5 drag cancels pointer streams and has no touch support.                                                                                         |
| vue-router `/stats`, `/settings`   | Lazily loaded dialogs             | Same code-splitting benefit without routing for a single-screen game.                                                                                       |
| Sentry                             | Pluggable `errorReporter`         | Global Vue/window handlers are installed; register a Sentry adapter when a DSN is available (see below).                                                    |
| Vercel deploy job, staging URL     | `vercel.json` / `netlify.toml`    | Deployment requires project secrets; the build output is static and ready for either host.                                                                  |

### Error tracking

`src/utils/errorReporter.ts` installs `app.config.errorHandler`, `window.onerror`
and `unhandledrejection` handlers. To forward to Sentry:

```ts
import * as Sentry from '@sentry/vue'
import { registerErrorReporter } from '@/utils/errorReporter'

Sentry.init({ app, dsn: import.meta.env.VITE_SENTRY_DSN })
registerErrorReporter((error) => Sentry.captureException(error))
```

Remember to add the Sentry ingest host to `connect-src` in the CSP in `index.html`.

## Testing

- **Unit (Vitest):** the domain engine and utilities are held to 100% coverage,
  stores to 95%, composables to 90% and components to 80% (enforced in
  `vitest.config.ts`). Includes a randomised invariant test that plays
  thousands of legal moves across seeded deals.
- **Component (@vue/test-utils):** cards, piles, controls, dialogs and a full
  `App` integration test.
- **E2E (Playwright):** desktop and mobile projects cover dealing, drawing and
  recycling, drag-and-drop (single cards and runs), invalid drops, Esc cancel,
  double-click, tap-to-move, undo/redo, hints, auto-complete, winning,
  persistence, settings and keyboard-only play, asserting no console errors.
- **Accessibility:** axe-core scans every theme and dialog for WCAG 2.1 AA.

E2E tests run against `vite build --mode e2e`, which additionally exposes
`window.__solitaire` for loading fixture layouts. Production builds never
include these hooks.

## Continuous integration

`.github/workflows/ci.yml` runs lint, format check, type-check and unit tests
with coverage (uploaded to Codecov when configured), builds and checks the
bundle budget, runs the Playwright suite, runs Lighthouse CI against the
build (`lighthouserc.json`), and audits production dependencies. Husky runs
lint-staged on commit and commitlint enforces Conventional Commits.

## License

MIT — see [LICENSE](./LICENSE). Originally created by Jeremy Danyow with Aurelia.
