# Klondike Solitaire - Vue.js Modernization Specification

**Version:** 2.0.0
**Date:** 2025-12-06
**Status:** Planning
**Author:** Technical Architecture Team

---

## Executive Summary

This specification documents the complete modernization of the Aurelia-based Solitaire game to a production-ready Vue.js 3 application. The project aims to transform a 2015-era demo application into a professional-grade, maintainable, accessible, and performant web game using current industry best practices.

### Key Objectives

- **Modernize Technology Stack**: Migrate from Aurelia 0.16 (2015) to Vue.js 3 with Composition API
- **Implement Professional Patterns**: Apply SOLID principles, comprehensive testing, and type safety
- **Enhance User Experience**: Improve accessibility, performance, and mobile responsiveness
- **Establish Maintainability**: Implement CI/CD, documentation, and developer tooling
- **Production Readiness**: Deploy-ready application with monitoring and error tracking

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Technical Stack](#technical-stack)
4. [Design Patterns & Best Practices](#design-patterns--best-practices)
5. [Feature Specifications](#feature-specifications)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [Game Logic Architecture](#game-logic-architecture)
9. [UI/UX Requirements](#uiux-requirements)
10. [Testing Strategy](#testing-strategy)
11. [Performance Requirements](#performance-requirements)
12. [Accessibility Requirements](#accessibility-requirements)
13. [Security Considerations](#security-considerations)
14. [Development Workflow](#development-workflow)
15. [Migration Phases](#migration-phases)
16. [Success Metrics](#success-metrics)
17. [Appendices](#appendices)

---

## Current State Analysis

### Existing Architecture

```
aurelia-solitaire/
├── src/
│   ├── klondike.js         # Game logic (146 LOC) - Event-driven coordinator
│   ├── table.js            # Table state (65 LOC) - Linked list operations
│   ├── dealer.js           # Card dealing & shuffle
│   ├── card.js             # Card model
│   ├── pile.js             # Pile data structure
│   ├── card-element.js     # Card custom element
│   ├── pile-element.js     # Pile custom element
│   ├── drag-and-drop.js    # Dragula integration
│   ├── events.js           # Event definitions
│   └── suits.js            # Suit constants
└── styles/                 # CSS files
```

### Technical Debt Identified

| Issue | Impact | Priority |
|-------|--------|----------|
| No test coverage (0%) | High | Critical |
| Deprecated `::` bind operator | Medium | High |
| Brittle DOM traversal (`parentElement.parentElement`) | Medium | High |
| Linked-list card storage | Medium | Medium |
| No TypeScript/type safety | High | High |
| Outdated dependencies (2015) | Critical | Critical |
| No error handling | High | High |
| 1.5MB unoptimized images | Medium | Medium |
| No accessibility support | High | High |

### Key Business Logic to Preserve

1. **Klondike Rules Engine**
   - Valid move validation (tableau/foundation rules)
   - Win condition detection
   - Deck cycling logic

2. **Card Operations**
   - Fisher-Yates shuffle algorithm
   - Card dealing (7 tableau piles, 24-card deck)
   - Card movement and reveal mechanics

3. **Game Events**
   - Single click (deck waste)
   - Double click (auto-move to foundation)
   - Drag-and-drop card movement

---

## Target Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
│  ┌────────────┐  ┌──────────┐  ┌────────────┐             │
│  │   Card     │  │   Pile   │  │   Game     │             │
│  │ Component  │  │Component │  │   Board    │             │
│  └────────────┘  └──────────┘  └────────────┘             │
│         │              │              │                     │
│         └──────────────┴──────────────┘                     │
│                        │                                    │
├────────────────────────┼────────────────────────────────────┤
│                 Composition Layer                           │
│  ┌─────────────────────┴──────────────────────┐            │
│  │  Composables (Business Logic)              │            │
│  │  - useGameState()     - useCardOperations()│            │
│  │  - useDragDrop()      - useGameRules()     │            │
│  │  - useAnimations()    - useAudio()         │            │
│  └────────────────────┬───────────────────────┘            │
│                       │                                     │
├───────────────────────┼─────────────────────────────────────┤
│                  State Layer                                │
│  ┌────────────────────┴──────────────────────┐             │
│  │  Pinia Store (Game State)                 │             │
│  │  - Game board state                       │             │
│  │  - Card positions                         │             │
│  │  - Move history (undo/redo)               │             │
│  │  - Statistics & achievements              │             │
│  └────────────────────┬──────────────────────┘             │
│                       │                                     │
├───────────────────────┼─────────────────────────────────────┤
│                  Domain Layer                               │
│  ┌────────────────────┴──────────────────────┐             │
│  │  Core Game Engine (Framework-agnostic)    │             │
│  │  - Card.ts           - Pile.ts            │             │
│  │  - GameRules.ts      - Dealer.ts          │             │
│  │  - MoveValidator.ts  - GameEngine.ts      │             │
│  └────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Principles

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and state
2. **Framework Agnostic Core**: Game engine can be used independently of Vue
3. **Testability**: All layers independently testable
4. **Type Safety**: Full TypeScript coverage
5. **Immutability**: State mutations only through actions
6. **Single Responsibility**: Each module has one clear purpose

---

## Technical Stack

### Core Framework & Build Tools

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **Vue.js** | 3.4+ | UI Framework | Modern, performant, excellent TypeScript support |
| **TypeScript** | 5.3+ | Type Safety | Catch errors at compile-time, better DX |
| **Vite** | 5.0+ | Build Tool | Fast HMR, optimized production builds |
| **Pinia** | 2.1+ | State Management | Official Vue state library, simpler than Vuex |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit testing (Vite-native, fast) |
| **@vue/test-utils** | Component testing |
| **Playwright** | E2E testing |
| **ESLint** | Code linting (Vue, TypeScript, Accessibility) |
| **Prettier** | Code formatting |
| **TypeDoc** | API documentation generation |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit linting |
| **Commitlint** | Conventional commits |

### UI & Interaction Libraries

| Library | Purpose | Rationale |
|---------|---------|-----------|
| **@vueuse/core** | Composition utilities | Battle-tested composables |
| **@vueuse/gesture** | Touch/gesture handling | Mobile drag-and-drop support |
| **VueDraggable Plus** | Drag-and-drop | Modern Vue 3 drag library |
| **Headless UI** | Accessible components | WAI-ARIA compliant primitives |
| **Tailwind CSS** | Styling | Utility-first, tree-shakable, modern |

### Quality & Monitoring

| Tool | Purpose |
|------|---------|
| **Sentry** | Error tracking |
| **Lighthouse CI** | Performance monitoring |
| **axe-core** | Accessibility testing |
| **Bundle Analyzer** | Build size optimization |

### DevOps & Hosting

| Service | Purpose |
|---------|---------|
| **GitHub Actions** | CI/CD pipeline |
| **Vercel/Netlify** | Static hosting |
| **Codecov** | Coverage reporting |

---

## Design Patterns & Best Practices

### 1. Composition API Pattern

**Use composables for reusable logic:**

```typescript
// ❌ Old Aurelia Pattern (Options API style)
@inject(EventAggregator, Dealer, Table)
export class Klondike {
  constructor(eventAggregator, dealer, table) {
    this.table = table;
    eventAggregator.subscribe(CardClickedEvent, ::this.cardClicked);
  }
}

// ✅ New Vue 3 Pattern (Composition API)
export function useGameState() {
  const gameState = ref<GameState>(initialState())
  const moveCard = (card: Card, target: Pile) => { /* ... */ }

  return {
    gameState: readonly(gameState),
    moveCard
  }
}
```

### 2. Domain-Driven Design

**Framework-agnostic core domain models:**

```typescript
// domain/models/Card.ts
export class Card {
  constructor(
    public readonly suit: Suit,
    public readonly rank: Rank,
    public readonly id: string = generateCardId(suit, rank)
  ) {}

  get isRed(): boolean {
    return this.suit === Suit.Hearts || this.suit === Suit.Diamonds
  }

  equals(other: Card): boolean {
    return this.id === other.id
  }
}

// domain/services/GameRules.ts
export class KlondikeRules {
  static canMoveToTableau(card: Card, targetPile: Pile): boolean {
    if (targetPile.isEmpty()) {
      return card.rank === Rank.King
    }
    const topCard = targetPile.topCard()
    return topCard.rank === card.rank + 1 && topCard.isRed !== card.isRed
  }
}
```

### 3. Repository Pattern for State

**Encapsulate state access:**

```typescript
// stores/gameStore.ts
export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>(initialState())

  // Queries (getters)
  const foundation = computed(() => state.value.foundation)
  const tableau = computed(() => state.value.tableau)
  const canUndo = computed(() => state.value.history.length > 0)

  // Commands (actions)
  function moveCard(card: Card, target: Pile): MoveResult {
    const validator = new MoveValidator(state.value)
    if (!validator.isValid(card, target)) {
      return { success: false, reason: 'Invalid move' }
    }

    // Record move for undo
    state.value.history.push(createSnapshot(state.value))

    // Execute move
    executeMoveCommand(state.value, card, target)

    return { success: true }
  }

  return { foundation, tableau, canUndo, moveCard }
})
```

### 4. Command Pattern for Game Actions

**Undoable operations:**

```typescript
// domain/commands/MoveCommand.ts
interface Command {
  execute(): void
  undo(): void
}

export class MoveCardCommand implements Command {
  private previousState: PileSnapshot

  constructor(
    private card: Card,
    private source: Pile,
    private target: Pile
  ) {}

  execute(): void {
    this.previousState = this.source.snapshot()
    this.source.removeCard(this.card)
    this.target.addCard(this.card)
  }

  undo(): void {
    this.target.removeCard(this.card)
    this.source.restore(this.previousState)
  }
}
```

### 5. Strategy Pattern for Game Variations

**Future-proof for different solitaire variants:**

```typescript
// domain/strategies/GameVariant.ts
interface SolitaireRules {
  canMove(card: Card, pile: Pile): boolean
  checkWin(state: GameState): boolean
  initialDeal(): DealConfiguration
}

export class KlondikeRules implements SolitaireRules {
  canMove(card: Card, pile: Pile): boolean {
    // Klondike-specific logic
  }
}

export class SpiderRules implements SolitaireRules {
  canMove(card: Card, pile: Pile): boolean {
    // Spider-specific logic
  }
}
```

### 6. Observer Pattern for Events

**Type-safe event system:**

```typescript
// composables/useGameEvents.ts
export function useGameEvents() {
  const eventBus = mitt<{
    'card:clicked': Card
    'card:doubleClicked': Card
    'card:dropped': { card: Card; pile: Pile }
    'game:won': { moves: number; time: number }
    'game:reset': void
  }>()

  return eventBus
}
```

### 7. Builder Pattern for Complex Objects

```typescript
// domain/builders/GameBuilder.ts
export class GameBuilder {
  private config: Partial<GameConfig> = {}

  withDifficulty(difficulty: Difficulty): this {
    this.config.difficulty = difficulty
    return this
  }

  withDrawCount(count: 1 | 3): this {
    this.config.drawCount = count
    return this
  }

  build(): Game {
    return new Game(this.config)
  }
}

// Usage
const game = new GameBuilder()
  .withDifficulty('hard')
  .withDrawCount(3)
  .build()
```

---

## Feature Specifications

### Core Game Features

#### F1: New Game
**Priority:** P0 (MVP)

- **Description:** Start a new game with shuffled deck
- **User Story:** As a player, I want to start a new game so I can play solitaire
- **Acceptance Criteria:**
  - Deck is shuffled using cryptographically random shuffle
  - 7 tableau piles dealt (1-7 cards, top card face-up)
  - 24 cards remain in deck (face-down)
  - Foundation piles are empty
  - Previous game state is cleared
  - Move counter resets to 0
  - Timer resets to 0

#### F2: Card Movement
**Priority:** P0 (MVP)

##### F2.1: Drag-and-Drop
- **User Story:** As a player, I want to drag cards to move them
- **Acceptance Criteria:**
  - Can drag single cards or valid sequences
  - Invalid drop targets show visual feedback
  - Cards snap back on invalid drops with animation
  - Touch-friendly on mobile devices
  - Keyboard alternative available (arrow keys)

##### F2.2: Double-Click Auto-Move
- **User Story:** As a player, I want to double-click a card to auto-move it to foundation
- **Acceptance Criteria:**
  - Auto-finds valid foundation pile
  - Only works for face-up top cards
  - Provides visual feedback if no valid move

##### F2.3: Single-Click Deck
- **User Story:** As a player, I want to click deck to draw cards
- **Acceptance Criteria:**
  - Draws 1 card (easy mode) or 3 cards (standard mode)
  - Cards move to waste pile face-up
  - Click empty deck to recycle waste pile

#### F3: Move Validation
**Priority:** P0 (MVP)

**Business Rules:**

**Tableau Rules:**
- Can place card on tableau if:
  - Target pile is empty AND card is King, OR
  - Target top card rank is exactly 1 higher AND opposite color

**Foundation Rules:**
- Can place card on foundation if:
  - Pile is empty AND card is Ace, OR
  - Same suit AND rank is exactly 1 higher

#### F4: Win Detection
**Priority:** P0 (MVP)

- **Acceptance Criteria:**
  - Win when all 4 foundation piles have King on top
  - Victory animation plays
  - Statistics recorded (moves, time)
  - Option to start new game

#### F5: Undo/Redo
**Priority:** P1 (High)

- **User Story:** As a player, I want to undo mistakes
- **Acceptance Criteria:**
  - Undo button/keyboard shortcut (Ctrl+Z)
  - Redo button/keyboard shortcut (Ctrl+Y)
  - Unlimited undo history
  - Visual indication when undo/redo available
  - Undo stack cleared on new game

#### F6: Game Statistics
**Priority:** P1 (High)

**Tracked Metrics:**
- Games played
- Games won
- Win percentage
- Best time
- Fewest moves
- Current streak
- Total playtime

**Storage:** LocalStorage with periodic backup

#### F7: Hints System
**Priority:** P2 (Nice-to-have)

- **User Story:** As a player, I want hints when stuck
- **Acceptance Criteria:**
  - Analyzes board for valid moves
  - Highlights best move suggestion
  - Limited hints per game (optional difficulty setting)
  - Keyboard shortcut (H)

#### F8: Themes
**Priority:** P2 (Nice-to-have)

**Available Themes:**
- Classic (green felt, traditional cards)
- Dark mode
- High contrast (accessibility)
- Custom card backs

#### F9: Sound Effects
**Priority:** P2 (Nice-to-have)

**Audio Events:**
- Card shuffle
- Card flip
- Card place
- Invalid move
- Win celebration

**Requirements:**
- Mute toggle
- Volume control
- Respects `prefers-reduced-motion`

---

## Component Architecture

### Component Hierarchy

```
App.vue
├── GameBoard.vue (Smart Component)
│   ├── GameHeader.vue
│   │   ├── TimerDisplay.vue
│   │   ├── MoveCounter.vue
│   │   └── GameControls.vue
│   │       ├── NewGameButton.vue
│   │       ├── UndoButton.vue
│   │       └── SettingsButton.vue
│   │
│   ├── GameTable.vue (Game Layout)
│   │   ├── StockArea.vue
│   │   │   ├── DeckPile.vue
│   │   │   └── WastePile.vue
│   │   │
│   │   ├── FoundationArea.vue
│   │   │   └── FoundationPile.vue (×4)
│   │   │
│   │   └── TableauArea.vue
│   │       └── TableauPile.vue (×7)
│   │
│   ├── CardComponent.vue (Presentational)
│   │   ├── CardFront.vue
│   │   └── CardBack.vue
│   │
│   └── GameModals.vue
│       ├── WinModal.vue
│       ├── SettingsModal.vue
│       └── StatsModal.vue
│
└── AppShell.vue
    ├── NavigationBar.vue
    └── Footer.vue
```

### Component Specifications

#### CardComponent.vue

**Props:**
```typescript
interface CardProps {
  card: Card
  faceUp: boolean
  draggable?: boolean
  position?: 'stacked' | 'fanned'
  offsetIndex?: number
  selected?: boolean
}
```

**Events:**
```typescript
interface CardEmits {
  (e: 'click', card: Card): void
  (e: 'dblclick', card: Card): void
  (e: 'dragstart', card: Card): void
  (e: 'dragend', card: Card): void
}
```

**Responsibilities:**
- Render card visual (rank, suit, colors)
- Handle interaction events
- Apply CSS transforms for position
- Accessibility labels

**Example Template:**
```vue
<template>
  <div
    :class="cardClasses"
    :draggable="draggable"
    :aria-label="ariaLabel"
    role="img"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  >
    <CardFront v-if="faceUp" :card="card" />
    <CardBack v-else />
  </div>
</template>
```

#### TableauPile.vue

**Props:**
```typescript
interface TableauPileProps {
  pile: Pile
  pileIndex: number
  cards: Card[]
}
```

**Responsibilities:**
- Render fanned card stack
- Handle drop zone highlighting
- Emit drop events
- Calculate card offsets for fanning

#### FoundationPile.vue

**Props:**
```typescript
interface FoundationPileProps {
  suit: Suit
  cards: Card[]
}
```

**Responsibilities:**
- Show suit placeholder when empty
- Render top card only
- Accept drops of valid cards

---

## State Management

### Pinia Store Structure

```typescript
// stores/gameStore.ts
export const useGameStore = defineStore('game', () => {
  // State
  const gameState = ref<GameState>({
    deck: [],
    waste: [],
    foundation: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    moveHistory: [],
    futureHistory: [], // for redo
    gameStatus: 'idle', // idle | playing | won
    startTime: null,
    moveCount: 0,
    drawCount: 3, // 1 or 3
  })

  const statistics = ref<Statistics>({
    gamesPlayed: 0,
    gamesWon: 0,
    bestTime: Infinity,
    fewestMoves: Infinity,
    currentStreak: 0,
  })

  // Getters
  const canUndo = computed(() => gameState.value.moveHistory.length > 0)
  const canRedo = computed(() => gameState.value.futureHistory.length > 0)
  const elapsedTime = computed(() => {
    if (!gameState.value.startTime) return 0
    return Date.now() - gameState.value.startTime
  })
  const hasWon = computed(() => {
    return gameState.value.foundation.every(pile => pile.length === 13)
  })

  // Actions
  function newGame() {
    const dealer = new Dealer()
    gameState.value = dealer.deal(gameState.value.drawCount)
    gameState.value.startTime = Date.now()
    gameState.value.gameStatus = 'playing'
  }

  function moveCard(card: Card, targetPile: PileLocation): MoveResult {
    // Validate move
    const validator = new MoveValidator(gameState.value)
    if (!validator.canMove(card, targetPile)) {
      return { success: false, reason: validator.getReason() }
    }

    // Save state for undo
    gameState.value.moveHistory.push(cloneDeep(gameState.value))
    gameState.value.futureHistory = [] // clear redo stack

    // Execute move
    executeMove(gameState.value, card, targetPile)
    gameState.value.moveCount++

    // Check win
    if (hasWon.value) {
      handleWin()
    }

    return { success: true }
  }

  function undo() {
    if (!canUndo.value) return

    gameState.value.futureHistory.push(cloneDeep(gameState.value))
    gameState.value = gameState.value.moveHistory.pop()!
  }

  function redo() {
    if (!canRedo.value) return

    gameState.value.moveHistory.push(cloneDeep(gameState.value))
    gameState.value = gameState.value.futureHistory.pop()!
  }

  function handleWin() {
    gameState.value.gameStatus = 'won'

    // Update statistics
    statistics.value.gamesWon++
    statistics.value.currentStreak++

    const time = elapsedTime.value
    if (time < statistics.value.bestTime) {
      statistics.value.bestTime = time
    }

    if (gameState.value.moveCount < statistics.value.fewestMoves) {
      statistics.value.fewestMoves = gameState.value.moveCount
    }

    // Persist to localStorage
    saveStatistics()
  }

  // Load from localStorage on init
  const savedStats = localStorage.getItem('solitaire-stats')
  if (savedStats) {
    statistics.value = JSON.parse(savedStats)
  }

  return {
    // State
    gameState: readonly(gameState),
    statistics: readonly(statistics),

    // Getters
    canUndo,
    canRedo,
    elapsedTime,
    hasWon,

    // Actions
    newGame,
    moveCard,
    undo,
    redo,
  }
})
```

---

## Game Logic Architecture

### Domain Models

#### Card.ts

```typescript
export enum Suit {
  Hearts = 'hearts',
  Diamonds = 'diamonds',
  Clubs = 'clubs',
  Spades = 'spades',
}

export enum Rank {
  Ace = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
}

export class Card {
  public readonly id: string

  constructor(
    public readonly suit: Suit,
    public readonly rank: Rank
  ) {
    this.id = `${suit}-${rank}`
  }

  get isRed(): boolean {
    return this.suit === Suit.Hearts || this.suit === Suit.Diamonds
  }

  get isBlack(): boolean {
    return !this.isRed
  }

  get displayRank(): string {
    const rankMap: Record<number, string> = {
      1: 'A',
      11: 'J',
      12: 'Q',
      13: 'K',
    }
    return rankMap[this.rank] || this.rank.toString()
  }

  equals(other: Card): boolean {
    return this.id === other.id
  }

  canStackOn(other: Card, isFoundation: boolean): boolean {
    if (isFoundation) {
      return this.suit === other.suit && this.rank === other.rank + 1
    } else {
      // Tableau: descending rank, alternating colors
      return this.rank === other.rank - 1 && this.isRed !== other.isRed
    }
  }
}
```

#### Pile.ts

```typescript
export type PileType = 'deck' | 'waste' | 'foundation' | 'tableau'

export interface PileConfig {
  type: PileType
  suit?: Suit // for foundation piles
  index?: number // for tableau piles
}

export class Pile {
  private cards: Card[] = []

  constructor(private config: PileConfig) {}

  get type(): PileType {
    return this.config.type
  }

  get isEmpty(): boolean {
    return this.cards.length === 0
  }

  get topCard(): Card | undefined {
    return this.cards[this.cards.length - 1]
  }

  get allCards(): readonly Card[] {
    return this.cards
  }

  canAccept(card: Card): boolean {
    const validator = PileValidatorFactory.create(this.type)
    return validator.canAccept(this, card)
  }

  addCard(card: Card): void {
    this.cards.push(card)
  }

  removeCard(card: Card): Card {
    const index = this.cards.findIndex(c => c.equals(card))
    if (index === -1) {
      throw new Error(`Card ${card.id} not found in pile`)
    }
    return this.cards.splice(index, 1)[0]
  }

  removeFromTop(count: number = 1): Card[] {
    if (count > this.cards.length) {
      throw new Error(`Cannot remove ${count} cards, only ${this.cards.length} available`)
    }
    return this.cards.splice(-count, count)
  }

  clear(): void {
    this.cards = []
  }
}
```

#### GameRules.ts

```typescript
export class KlondikeRules {
  static canMoveToTableau(card: Card, pile: Pile): boolean {
    if (pile.isEmpty) {
      return card.rank === Rank.King
    }

    const topCard = pile.topCard!
    return topCard.rank === card.rank + 1 && topCard.isRed !== card.isRed
  }

  static canMoveToFoundation(card: Card, pile: Pile): boolean {
    if (pile.isEmpty) {
      return card.rank === Rank.Ace
    }

    const topCard = pile.topCard!
    return topCard.suit === card.suit && card.rank === topCard.rank + 1
  }

  static canDrawFromDeck(deck: Pile, drawCount: number): boolean {
    return !deck.isEmpty
  }

  static hasWon(foundation: Pile[]): boolean {
    return foundation.every(pile => {
      const top = pile.topCard
      return top && top.rank === Rank.King
    })
  }

  static findAutoMoveTarget(
    card: Card,
    foundation: Pile[]
  ): Pile | undefined {
    return foundation.find(pile => {
      if (pile.isEmpty) {
        return card.rank === Rank.Ace
      }
      const top = pile.topCard!
      return top.suit === card.suit && card.rank === top.rank + 1
    })
  }
}
```

#### Dealer.ts

```typescript
export class Dealer {
  private deck: Card[] = []

  constructor() {
    this.createDeck()
  }

  private createDeck(): void {
    this.deck = []
    for (const suit of Object.values(Suit)) {
      for (let rank = 1; rank <= 13; rank++) {
        this.deck.push(new Card(suit, rank as Rank))
      }
    }
  }

  shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
    }
  }

  deal(drawCount: 1 | 3 = 3): GameState {
    this.shuffle()

    const gameState: GameState = {
      deck: [],
      waste: [],
      foundation: [[], [], [], []],
      tableau: [[], [], [], [], [], [], []],
      moveHistory: [],
      futureHistory: [],
      gameStatus: 'idle',
      startTime: null,
      moveCount: 0,
      drawCount,
    }

    // Deal to tableau
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        gameState.tableau[j].push(this.deck.pop()!)
      }
    }

    // Remaining cards go to deck
    gameState.deck = this.deck.splice(0)

    return gameState
  }
}
```

---

## UI/UX Requirements

### Visual Design

#### Layout Specifications

**Desktop (>= 1024px):**
```
┌─────────────────────────────────────────────────┐
│  Timer: 00:42    Moves: 23    [New] [Undo]     │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Deck] [Waste]         [F♥] [F♦] [F♠] [F♣]    │
│                                                  │
│  [T1]  [T2]  [T3]  [T4]  [T5]  [T6]  [T7]      │
│   A♠    2♥    3♣    4♦    5♠    6♥    7♣       │
│         3♣    4♦    5♠    6♥    7♣    8♦       │
│               5♦    6♠    7♥    8♣              │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Mobile (< 768px):**
- Stack foundation piles above tableau
- Reduce card sizes proportionally
- Use overflow scroll for wide layouts

#### Card Dimensions

```css
/* Desktop */
--card-width: 80px;
--card-height: 112px; /* 1.4:1 ratio */
--card-radius: 8px;

/* Mobile */
--card-width-mobile: 60px;
--card-height-mobile: 84px;

/* Spacing */
--tableau-fan-offset: 24px; /* vertical offset for fanned cards */
--pile-gap: 8px;
```

#### Color Palette

```css
:root {
  /* Table */
  --table-bg: #1a5e2e; /* green felt */
  --table-border: #0f3d1e;

  /* Cards */
  --card-bg: #ffffff;
  --card-border: #d4d4d4;
  --card-back: #2563eb;
  --card-shadow: rgba(0, 0, 0, 0.1);

  /* Suits */
  --suit-red: #dc2626;
  --suit-black: #1f2937;

  /* Interactive states */
  --drop-target-valid: rgba(34, 197, 94, 0.3);
  --drop-target-invalid: rgba(239, 68, 68, 0.3);
  --card-selected: rgba(59, 130, 246, 0.5);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --table-bg: #0f172a;
    --table-border: #1e293b;
    --card-bg: #1e293b;
    --card-border: #334155;
  }
}
```

#### Animations

```css
/* Card flip */
.card-flip {
  animation: flip 0.3s ease-in-out;
}

@keyframes flip {
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(90deg); }
  100% { transform: rotateY(0deg); }
}

/* Card move */
.card-move {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Win celebration */
.card-celebrate {
  animation: celebrate 1s ease-in-out;
}

@keyframes celebrate {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-20px) rotate(-5deg); }
  75% { transform: translateY(-10px) rotate(5deg); }
}
```

### Interaction Patterns

#### Drag-and-Drop Behavior

1. **Drag Start:**
   - Only draggable if card is face-up and pile allows dragging
   - Create ghost image of card(s) being dragged
   - Dim original card position

2. **Drag Over:**
   - Highlight valid drop targets (green glow)
   - Show invalid targets (red border)
   - Change cursor to indicate valid/invalid

3. **Drop:**
   - Animate card to final position
   - Play sound effect
   - Update move counter
   - Check for win condition

4. **Cancel (ESC or invalid drop):**
   - Animate card back to original position
   - Remove all highlights

#### Touch Gestures

- **Tap:** Select card
- **Double-tap:** Auto-move to foundation
- **Long-press + drag:** Move card
- **Swipe on deck:** Draw cards

#### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between piles |
| `Space` / `Enter` | Select/activate card |
| `Arrow Keys` | Move selection |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `N` | New game |
| `H` | Hint |
| `Esc` | Cancel drag/close modal |

---

## Testing Strategy

### Test Coverage Goals

| Layer | Coverage Target | Priority |
|-------|----------------|----------|
| Domain Logic | 100% | Critical |
| Store/Actions | 95% | Critical |
| Composables | 90% | High |
| Components | 80% | Medium |
| E2E Critical Paths | 100% | High |

### Test Pyramid

```
        ╱────────────╲
       ╱  E2E Tests   ╲        ~20 tests
      ╱────────────────╲
     ╱ Integration Tests ╲     ~50 tests
    ╱────────────────────╲
   ╱    Unit Tests        ╲    ~200 tests
  ╱────────────────────────╲
```

### Unit Tests (Vitest)

**Domain Models:**

```typescript
// domain/models/__tests__/Card.spec.ts
describe('Card', () => {
  describe('color detection', () => {
    it('should identify red cards correctly', () => {
      const card = new Card(Suit.Hearts, Rank.Ace)
      expect(card.isRed).toBe(true)
      expect(card.isBlack).toBe(false)
    })

    it('should identify black cards correctly', () => {
      const card = new Card(Suit.Spades, Rank.King)
      expect(card.isBlack).toBe(true)
      expect(card.isRed).toBe(false)
    })
  })

  describe('canStackOn', () => {
    it('should allow stacking descending ranks with alternating colors on tableau', () => {
      const redQueen = new Card(Suit.Hearts, Rank.Queen)
      const blackJack = new Card(Suit.Spades, Rank.Jack)

      expect(blackJack.canStackOn(redQueen, false)).toBe(true)
    })

    it('should reject same color on tableau', () => {
      const redQueen = new Card(Suit.Hearts, Rank.Queen)
      const redJack = new Card(Suit.Diamonds, Rank.Jack)

      expect(redJack.canStackOn(redQueen, false)).toBe(false)
    })

    it('should allow ascending same suit on foundation', () => {
      const heartsAce = new Card(Suit.Hearts, Rank.Ace)
      const heartsTwo = new Card(Suit.Hearts, Rank.Two)

      expect(heartsTwo.canStackOn(heartsAce, true)).toBe(true)
    })
  })
})
```

**Game Rules:**

```typescript
// domain/services/__tests__/GameRules.spec.ts
describe('KlondikeRules', () => {
  describe('canMoveToTableau', () => {
    it('should allow King on empty tableau', () => {
      const king = new Card(Suit.Hearts, Rank.King)
      const emptyPile = new Pile({ type: 'tableau', index: 0 })

      expect(KlondikeRules.canMoveToTableau(king, emptyPile)).toBe(true)
    })

    it('should reject non-King on empty tableau', () => {
      const queen = new Card(Suit.Hearts, Rank.Queen)
      const emptyPile = new Pile({ type: 'tableau', index: 0 })

      expect(KlondikeRules.canMoveToTableau(queen, emptyPile)).toBe(false)
    })

    it('should allow alternating color descending sequence', () => {
      const pile = new Pile({ type: 'tableau', index: 0 })
      pile.addCard(new Card(Suit.Hearts, Rank.Seven))

      const blackSix = new Card(Suit.Spades, Rank.Six)

      expect(KlondikeRules.canMoveToTableau(blackSix, pile)).toBe(true)
    })
  })

  describe('hasWon', () => {
    it('should return true when all foundations have Kings', () => {
      const foundations = [
        createFoundationWithTopCard(Suit.Hearts, Rank.King),
        createFoundationWithTopCard(Suit.Diamonds, Rank.King),
        createFoundationWithTopCard(Suit.Clubs, Rank.King),
        createFoundationWithTopCard(Suit.Spades, Rank.King),
      ]

      expect(KlondikeRules.hasWon(foundations)).toBe(true)
    })

    it('should return false when any foundation is incomplete', () => {
      const foundations = [
        createFoundationWithTopCard(Suit.Hearts, Rank.King),
        createFoundationWithTopCard(Suit.Diamonds, Rank.Queen),
        createFoundationWithTopCard(Suit.Clubs, Rank.King),
        createFoundationWithTopCard(Suit.Spades, Rank.King),
      ]

      expect(KlondikeRules.hasWon(foundations)).toBe(false)
    })
  })
})
```

### Component Tests (@vue/test-utils)

```typescript
// components/__tests__/CardComponent.spec.ts
describe('CardComponent', () => {
  it('should render card rank and suit when face up', () => {
    const card = new Card(Suit.Hearts, Rank.Ace)
    const wrapper = mount(CardComponent, {
      props: { card, faceUp: true }
    })

    expect(wrapper.text()).toContain('A')
    expect(wrapper.find('.suit-hearts').exists()).toBe(true)
  })

  it('should show card back when face down', () => {
    const card = new Card(Suit.Hearts, Rank.Ace)
    const wrapper = mount(CardComponent, {
      props: { card, faceUp: false }
    })

    expect(wrapper.find('.card-back').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('A')
  })

  it('should emit click event', async () => {
    const card = new Card(Suit.Hearts, Rank.Ace)
    const wrapper = mount(CardComponent, {
      props: { card, faceUp: true }
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('click')![0]).toEqual([card])
  })

  it('should be draggable only when draggable prop is true', () => {
    const card = new Card(Suit.Hearts, Rank.Ace)
    const wrapper = mount(CardComponent, {
      props: { card, faceUp: true, draggable: true }
    })

    expect(wrapper.attributes('draggable')).toBe('true')
  })
})
```

### Integration Tests

```typescript
// stores/__tests__/gameStore.spec.ts
describe('gameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize new game correctly', () => {
    const store = useGameStore()
    store.newGame()

    expect(store.gameState.tableau).toHaveLength(7)
    expect(store.gameState.tableau[0]).toHaveLength(1)
    expect(store.gameState.tableau[6]).toHaveLength(7)
    expect(store.gameState.deck).toHaveLength(24)
    expect(store.gameState.moveCount).toBe(0)
  })

  it('should execute valid move and increment counter', () => {
    const store = useGameStore()
    store.newGame()

    // Setup a valid move scenario
    const card = store.gameState.tableau[0][0]
    const targetPile = /* ... */

    const result = store.moveCard(card, targetPile)

    expect(result.success).toBe(true)
    expect(store.gameState.moveCount).toBe(1)
    expect(store.canUndo).toBe(true)
  })

  it('should reject invalid move', () => {
    const store = useGameStore()
    store.newGame()

    // Setup an invalid move scenario
    const card = new Card(Suit.Hearts, Rank.Two)
    const emptyTableau = /* ... */

    const result = store.moveCard(card, emptyTableau)

    expect(result.success).toBe(false)
    expect(result.reason).toBeDefined()
    expect(store.gameState.moveCount).toBe(0)
  })

  it('should undo and redo moves correctly', () => {
    const store = useGameStore()
    store.newGame()

    const initialState = cloneDeep(store.gameState)

    // Make a move
    store.moveCard(/* ... */)
    const afterMoveState = cloneDeep(store.gameState)

    // Undo
    store.undo()
    expect(store.gameState).toEqual(initialState)

    // Redo
    store.redo()
    expect(store.gameState).toEqual(afterMoveState)
  })
})
```

### E2E Tests (Playwright)

```typescript
// e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Klondike Solitaire', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should start new game and display initial state', async ({ page }) => {
    await page.click('button:has-text("New Game")')

    // Check tableau has 7 piles
    const tableauPiles = page.locator('.tableau-pile')
    await expect(tableauPiles).toHaveCount(7)

    // Check first pile has 1 card visible
    const firstPile = tableauPiles.first()
    const cards = firstPile.locator('.card')
    await expect(cards).toHaveCount(1)

    // Check move counter is 0
    await expect(page.locator('.move-counter')).toHaveText('0')
  })

  test('should move card via drag-and-drop', async ({ page }) => {
    await page.click('button:has-text("New Game")')

    // Find draggable card
    const sourceCard = page.locator('.card').first()
    const targetPile = page.locator('.tableau-pile').nth(3)

    // Drag and drop
    await sourceCard.dragTo(targetPile)

    // Verify move counter incremented
    await expect(page.locator('.move-counter')).toHaveText('1')
  })

  test('should auto-move card to foundation on double-click', async ({ page }) => {
    // Setup game with ace exposed
    await setupGameWithAceExposed(page)

    const ace = page.locator('.card:has-text("A")')
    await ace.dblclick()

    // Verify ace moved to foundation
    const foundation = page.locator('.foundation-pile').first()
    await expect(foundation.locator('.card:has-text("A")')).toBeVisible()
  })

  test('should detect win and show victory modal', async ({ page }) => {
    // Use seeded game that's one move from winning
    await loadWinnableGame(page)

    // Make winning move
    await page.locator('.last-card').dragTo('.foundation-pile')

    // Check for win modal
    await expect(page.locator('.win-modal')).toBeVisible()
    await expect(page.locator('.win-modal')).toContainText('You Won!')
  })

  test('should undo move correctly', async ({ page }) => {
    await page.click('button:has-text("New Game")')

    const initialState = await captureGameState(page)

    // Make a move
    await page.locator('.card').first().dragTo('.tableau-pile').nth(3)

    // Undo
    await page.click('button[aria-label="Undo"]')

    const afterUndo = await captureGameState(page)
    expect(afterUndo).toEqual(initialState)
  })

  test('should be keyboard accessible', async ({ page }) => {
    await page.click('button:has-text("New Game")')

    // Tab to first card
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Check focus
    await expect(page.locator('.card:focus')).toBeVisible()

    // Activate with Enter
    await page.keyboard.press('Enter')

    // Navigate with arrows
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.tableau-pile:nth-child(2) .card:focus')).toBeVisible()
  })
})
```

### Accessibility Tests

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('should have no automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/')

    const results = await new AxeBuilder({ page }).analyze()

    expect(results.violations).toEqual([])
  })

  test('should have proper ARIA labels on cards', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("New Game")')

    const card = page.locator('.card').first()
    const ariaLabel = await card.getAttribute('aria-label')

    expect(ariaLabel).toMatch(/^(Ace|[2-9]|10|Jack|Queen|King) of (Hearts|Diamonds|Clubs|Spades)$/)
  })

  test('should announce game events to screen readers', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("New Game")')

    // Check for live region
    const liveRegion = page.locator('[aria-live="polite"]')
    await expect(liveRegion).toBeVisible()

    // Make a move
    await page.locator('.card').first().dragTo('.tableau-pile').nth(3)

    // Verify announcement
    await expect(liveRegion).toContainText('Moved card')
  })
})
```

---

## Performance Requirements

### Loading Performance

| Metric | Target | Budget |
|--------|--------|--------|
| **First Contentful Paint (FCP)** | < 1.0s | < 1.5s |
| **Largest Contentful Paint (LCP)** | < 2.0s | < 2.5s |
| **Time to Interactive (TTI)** | < 3.0s | < 4.0s |
| **Total Blocking Time (TBT)** | < 200ms | < 300ms |
| **Cumulative Layout Shift (CLS)** | < 0.1 | < 0.25 |

### Bundle Size

```
Target Bundle Sizes:
├── Main bundle (JS): < 100KB (gzipped)
├── CSS: < 20KB (gzipped)
├── Card images: < 200KB total
└── Total initial load: < 400KB
```

### Runtime Performance

- **Card animations:** 60 FPS (16.67ms per frame)
- **Drag-and-drop latency:** < 100ms
- **State updates:** < 50ms
- **Win detection:** < 10ms

### Optimization Strategies

#### Code Splitting

```typescript
// router/index.ts
const routes = [
  {
    path: '/',
    component: () => import('@/views/GameView.vue')
  },
  {
    path: '/stats',
    component: () => import('@/views/StatsView.vue') // Lazy-loaded
  },
  {
    path: '/settings',
    component: () => import('@/views/SettingsView.vue') // Lazy-loaded
  }
]
```

#### Image Optimization

1. **Use CSS for card suits (Unicode symbols):**
   ```css
   .suit-hearts::before { content: '♥'; }
   .suit-diamonds::before { content: '♦'; }
   .suit-clubs::before { content: '♣'; }
   .suit-spades::before { content: '♠'; }
   ```

2. **SVG sprites for card backs**
3. **Lazy-load card images with IntersectionObserver**

#### Virtual Scrolling (if needed for history view)

```typescript
import { useVirtualList } from '@vueuse/core'

const { list, containerProps, wrapperProps } = useVirtualList(
  moveHistory,
  { itemHeight: 48 }
)
```

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance

#### Perceivable

1. **Text Alternatives:**
   - All cards have descriptive `aria-label`: "Ace of Hearts", "King of Spades"
   - Pile placeholders labeled: "Empty foundation pile for Hearts"

2. **Color Contrast:**
   - Red cards: #dc2626 on white (7.8:1 ratio) ✓
   - Black cards: #1f2937 on white (14.2:1 ratio) ✓
   - Minimum 4.5:1 for all UI text

3. **Adaptable:**
   - Responsive layout for 320px to 4K displays
   - Works with 200% zoom
   - Supports forced colors mode (Windows High Contrast)

#### Operable

1. **Keyboard Accessible:**
   - All functionality available via keyboard
   - Visible focus indicators (2px solid ring)
   - Logical tab order

2. **Enough Time:**
   - No time limits on moves
   - Timer is optional (can be hidden in settings)

3. **Seizures:**
   - No flashing content
   - Animations respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

4. **Navigable:**
   - Skip links to main content
   - Clear page title: "Klondike Solitaire"
   - Descriptive headings

#### Understandable

1. **Readable:**
   - Language specified: `<html lang="en">`
   - Clear, simple language

2. **Predictable:**
   - Consistent navigation
   - No unexpected context changes

3. **Input Assistance:**
   - Error messages for invalid moves
   - Help available via `?` key

#### Robust

1. **Compatible:**
   - Valid HTML5 semantics
   - ARIA roles and properties
   - Tested with screen readers (NVDA, JAWS, VoiceOver)

### Screen Reader Support

```vue
<template>
  <!-- Live region for game announcements -->
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="sr-only"
  >
    {{ announcement }}
  </div>

  <!-- Card with full accessibility -->
  <div
    role="img"
    :aria-label="`${card.displayRank} of ${card.suit}`"
    :aria-describedby="card.faceUp ? undefined : 'card-back-desc'"
    :tabindex="isInteractive ? 0 : -1"
    @keydown.space.prevent="handleActivate"
    @keydown.enter.prevent="handleActivate"
  >
    <CardFront v-if="card.faceUp" />
    <CardBack v-else />
  </div>

  <span id="card-back-desc" class="sr-only">
    Card is face down
  </span>
</template>
```

---

## Security Considerations

### Input Validation

1. **State Integrity:**
   - Validate all moves on both client and (future) server
   - Prevent manipulation of game state via DevTools
   - Use readonly computed refs where appropriate

2. **LocalStorage Safety:**
   - Validate stored statistics before parsing
   - Sanitize user input in settings
   - Implement schema versioning

```typescript
function loadStatistics(): Statistics | null {
  try {
    const raw = localStorage.getItem('solitaire-stats')
    if (!raw) return null

    const data = JSON.parse(raw)

    // Validate schema
    if (!isValidStatistics(data)) {
      console.warn('Invalid statistics schema, resetting')
      return null
    }

    return data
  } catch (error) {
    console.error('Failed to load statistics:', error)
    return null
  }
}

function isValidStatistics(data: unknown): data is Statistics {
  return (
    typeof data === 'object' &&
    data !== null &&
    'gamesPlayed' in data &&
    typeof data.gamesPlayed === 'number' &&
    data.gamesPlayed >= 0
    // ... more validation
  )
}
```

### Content Security Policy

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self';
  "
>
```

### Dependency Security

- **Automated scanning:** Dependabot alerts enabled
- **Regular audits:** `npm audit` in CI pipeline
- **Minimal dependencies:** Only essential libraries

---

## Development Workflow

### Git Branching Strategy

```
main (production-ready)
  ├── develop (integration branch)
  │   ├── feature/game-logic
  │   ├── feature/ui-components
  │   ├── feature/drag-drop
  │   └── feature/statistics
  └── hotfix/critical-bug
```

### Commit Convention (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Example:**
```
feat(game): implement undo/redo functionality

- Add command pattern for reversible moves
- Store move history in Pinia store
- Add undo/redo UI buttons

Closes #42
```

### Code Review Checklist

- [ ] Code follows Vue 3 Composition API best practices
- [ ] TypeScript types are complete (no `any`)
- [ ] Unit tests added/updated (coverage maintained)
- [ ] Accessibility verified (keyboard, screen reader)
- [ ] Performance impact assessed (bundle size, runtime)
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Responsive on mobile and desktop

### CI/CD Pipeline (GitHub Actions)

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:unit
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  lighthouse:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://staging.solitaire.app
          budgetPath: ./lighthouse-budget.json

  deploy:
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: dist
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## Migration Phases

### Phase 1: Foundation (Weeks 1-2)

**Objectives:**
- Project scaffolding
- Core domain models
- Basic UI components

**Deliverables:**
- [ ] Vite + Vue 3 + TypeScript setup
- [ ] Card, Pile, Dealer domain models
- [ ] CardComponent, PileComponent (presentational)
- [ ] Basic Tailwind styling
- [ ] Unit tests for domain models (100% coverage)

**Success Criteria:**
- All domain logic tests passing
- Can render static cards and piles

---

### Phase 2: Game Logic (Weeks 3-4)

**Objectives:**
- Implement game engine
- State management
- Move validation

**Deliverables:**
- [ ] Pinia store with game state
- [ ] KlondikeRules validation
- [ ] New game initialization
- [ ] Move execution
- [ ] Win detection
- [ ] Store tests (95% coverage)

**Success Criteria:**
- Can programmatically play a full game
- All game rules correctly enforced

---

### Phase 3: Interactivity (Weeks 5-6)

**Objectives:**
- Drag-and-drop
- Click handlers
- Animations

**Deliverables:**
- [ ] useDragDrop composable
- [ ] Click/double-click handlers
- [ ] Card movement animations
- [ ] Drop target highlighting
- [ ] Touch gesture support

**Success Criteria:**
- Full game playable via UI
- Smooth 60 FPS animations

---

### Phase 4: Features (Weeks 7-8)

**Objectives:**
- Undo/redo
- Statistics
- Timer
- Sound effects

**Deliverables:**
- [ ] Command pattern for undo
- [ ] Statistics tracking
- [ ] Timer implementation
- [ ] Audio system
- [ ] Settings modal

**Success Criteria:**
- All core features functional
- LocalStorage persistence working

---

### Phase 5: Polish (Weeks 9-10)

**Objectives:**
- Accessibility
- Responsive design
- Performance optimization

**Deliverables:**
- [ ] Full keyboard navigation
- [ ] Screen reader support
- [ ] Mobile responsive layout
- [ ] Image optimization
- [ ] Code splitting
- [ ] Accessibility audit (100% pass)

**Success Criteria:**
- WCAG 2.1 AA compliant
- Lighthouse score > 90 all categories

---

### Phase 6: Testing & Documentation (Weeks 11-12)

**Objectives:**
- Comprehensive testing
- Documentation
- Deployment

**Deliverables:**
- [ ] E2E test suite (Playwright)
- [ ] Component tests
- [ ] API documentation (TypeDoc)
- [ ] User guide
- [ ] Developer README
- [ ] CI/CD pipeline
- [ ] Production deployment

**Success Criteria:**
- > 85% overall code coverage
- All E2E critical paths passing
- Deployed to production

---

## Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test Coverage** | > 85% | Codecov |
| **TypeScript Strict** | 100% | tsc --noEmit |
| **Lighthouse Performance** | > 90 | Lighthouse CI |
| **Lighthouse Accessibility** | 100 | Lighthouse CI |
| **Bundle Size** | < 100KB (gzipped) | Bundle Analyzer |
| **Build Time** | < 30s | CI logs |
| **Zero Console Errors** | 100% | E2E tests |

### Quality Metrics

| Metric | Target |
|--------|--------|
| **Code Review Approval** | 2+ reviewers |
| **Bug Escape Rate** | < 5% to production |
| **Documentation Coverage** | All public APIs |
| **Dependency Freshness** | All deps < 6 months old |

### User Experience Metrics (Post-Launch)

| Metric | Target |
|--------|--------|
| **Games Completed** | > 60% finish rate |
| **Session Duration** | > 5 minutes average |
| **Return Rate** | > 40% within 7 days |
| **Error Rate** | < 0.1% sessions |

---

## Appendices

### Appendix A: Technology Comparison

**Why Vue 3 over React/Angular?**

| Criterion | Vue 3 | React | Angular |
|-----------|-------|-------|---------|
| **Learning Curve** | Low | Medium | High |
| **TypeScript Support** | Excellent | Excellent | Native |
| **Bundle Size (min)** | ~34KB | ~42KB | ~78KB |
| **Reactivity** | Built-in (Proxy) | Manual (hooks) | Built-in (RxJS) |
| **Composition API** | Native | Hooks | Limited |
| **Tooling** | Vite (fast) | CRA/Vite | Angular CLI |
| **Documentation** | Excellent | Good | Excellent |

**Decision:** Vue 3 offers the best balance of simplicity, performance, and developer experience for this project.

---

### Appendix B: File Structure

```
solitaire-vue/
├── public/
│   ├── favicon.ico
│   └── card-back.svg
│
├── src/
│   ├── assets/
│   │   ├── styles/
│   │   │   ├── base.css
│   │   │   ├── animations.css
│   │   │   └── theme.css
│   │   └── sounds/
│   │       ├── shuffle.mp3
│   │       ├── flip.mp3
│   │       └── win.mp3
│   │
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameBoard.vue
│   │   │   ├── GameHeader.vue
│   │   │   ├── GameTable.vue
│   │   │   └── __tests__/
│   │   ├── cards/
│   │   │   ├── CardComponent.vue
│   │   │   ├── CardFront.vue
│   │   │   ├── CardBack.vue
│   │   │   └── __tests__/
│   │   ├── piles/
│   │   │   ├── DeckPile.vue
│   │   │   ├── WastePile.vue
│   │   │   ├── FoundationPile.vue
│   │   │   ├── TableauPile.vue
│   │   │   └── __tests__/
│   │   ├── modals/
│   │   │   ├── WinModal.vue
│   │   │   ├── SettingsModal.vue
│   │   │   └── StatsModal.vue
│   │   └── ui/
│   │       ├── Button.vue
│   │       ├── IconButton.vue
│   │       └── Modal.vue
│   │
│   ├── composables/
│   │   ├── useGameState.ts
│   │   ├── useDragDrop.ts
│   │   ├── useGameRules.ts
│   │   ├── useTimer.ts
│   │   ├── useAudio.ts
│   │   ├── useStatistics.ts
│   │   └── __tests__/
│   │
│   ├── domain/
│   │   ├── models/
│   │   │   ├── Card.ts
│   │   │   ├── Pile.ts
│   │   │   ├── GameState.ts
│   │   │   └── __tests__/
│   │   ├── services/
│   │   │   ├── Dealer.ts
│   │   │   ├── GameRules.ts
│   │   │   ├── MoveValidator.ts
│   │   │   └── __tests__/
│   │   ├── commands/
│   │   │   ├── MoveCommand.ts
│   │   │   ├── CommandHistory.ts
│   │   │   └── __tests__/
│   │   └── types/
│   │       ├── Suit.ts
│   │       ├── Rank.ts
│   │       └── PileType.ts
│   │
│   ├── stores/
│   │   ├── gameStore.ts
│   │   ├── settingsStore.ts
│   │   └── __tests__/
│   │
│   ├── utils/
│   │   ├── shuffle.ts
│   │   ├── storage.ts
│   │   └── __tests__/
│   │
│   ├── App.vue
│   └── main.ts
│
├── tests/
│   ├── e2e/
│   │   ├── game-flow.spec.ts
│   │   ├── accessibility.spec.ts
│   │   └── fixtures/
│   └── setup.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .eslintrc.cjs
├── .prettierrc.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tailwind.config.js
├── package.json
└── README.md
```

---

### Appendix C: API Documentation Template

```typescript
/**
 * Validates whether a card can be moved to a target pile according to Klondike rules.
 *
 * @param card - The card to move
 * @param targetPile - The destination pile
 * @returns Validation result with success flag and optional error message
 *
 * @example
 * ```ts
 * const validator = new MoveValidator(gameState)
 * const result = validator.validate(card, targetPile)
 * if (!result.success) {
 *   console.error(result.reason)
 * }
 * ```
 *
 * @see {@link KlondikeRules} for specific rule implementations
 */
export class MoveValidator {
  validate(card: Card, targetPile: Pile): ValidationResult {
    // ...
  }
}
```

---

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **Foundation** | Four piles where cards are built up by suit from Ace to King |
| **Tableau** | Seven main piles where cards are built down in alternating colors |
| **Stock (Deck)** | Face-down pile of undealt cards |
| **Waste** | Face-up pile where cards from stock are placed |
| **Draw Count** | Number of cards drawn from stock (1 or 3) |
| **Rank** | Card value (Ace, 2-10, Jack, Queen, King) |
| **Suit** | Card type (Hearts, Diamonds, Clubs, Spades) |
| **Fanning** | Offset card display showing all cards in a pile |
| **Composition API** | Vue 3's new reactive composition system |
| **Composable** | Reusable composition function (similar to React hooks) |
| **Pinia** | Official Vue state management library |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-06 | Technical Architecture Team | Initial specification |

---

**End of Specification**

Total Pages: ~45 (estimated)
