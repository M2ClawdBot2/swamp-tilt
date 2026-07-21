/**
 * Central game state. A vanilla zustand store (no React dependency here) so
 * it works in headless tests and the physics step alike via plain
 * getState()/setState() — no React round-trip on the hot path, matching the
 * "React never touches flipper state" rule from the build prompt (score and
 * mode state are UI-facing, not input-latency-critical, so this is fine).
 * Phase 4's HUD wraps this with React's `useStore(gameStore, selector)`.
 */
import { createStore } from 'zustand/vanilla'

export type Screen =
  | 'attract'
  | 'menu'
  | 'options'
  | 'highScores'
  | 'credits'
  | 'howToPlay'
  | 'play'
  | 'paused'
  | 'ballEnd'
  | 'gameOver'

export interface ModeTimer {
  name: string
  secondsLeft: number
  /** if true, the timer only ticks while the ball is inside a named zone (e.g. Reitz's bumper cluster) */
  ticksOnlyInZone: string | null
}

export interface GameState {
  screen: Screen
  score: number
  ballNumber: number // 1-indexed, resets each new game
  ballsInPlay: number
  totalBalls: number // 3 normally, 6 (or 4 on mobile) during Summary Judgment
  multiplier: number
  tilted: boolean
  tiltWarnings: number

  // Plunger / shooter lane
  ballInLane: boolean // a ball is sitting in the shooter lane, waiting to be launched
  plungerCharge: number // 0-1, how far the plunger is pulled back right now
  launched: boolean // has the current ball left the lane and entered play

  // L1 — Turlington Plaza
  tableLetters: boolean[] // T A B L E
  recruitLit: boolean
  recruitActive: boolean
  orbitSpinCount: number
  preacherStreak: number
  preacherMultiplier: number

  // L2 — The Reitz
  budgetLetters: boolean[] // B U D G E T
  charterLocks: number // 0-3
  charterActive: boolean
  fundingLit: boolean

  // L3 — The Bench
  gavelHit: boolean
  precedentSpins: number
  wizardLocked: boolean

  // Wizard mode
  wizardActive: boolean
  levelsVisitedThisBall: Set<1 | 2 | 3>

  activeModeName: string | null
  modeTimers: ModeTimer[]

  /** Written every render frame by main.ts (levelOfY of the primary ball) — HUD-only, not rules state. */
  liveLevel: 1 | 2 | 3

  log: string[]
}

export interface GameActions {
  reset(): void
  startGame(): void
  addScore(base: number, tag?: string): void
  setMultiplier(m: number): void
  markLevelVisited(level: 1 | 2 | 3): void
  pushLog(line: string): void
}

const initialTransient = (): Pick<
  GameState,
  | 'tableLetters'
  | 'recruitLit'
  | 'recruitActive'
  | 'orbitSpinCount'
  | 'preacherStreak'
  | 'preacherMultiplier'
  | 'budgetLetters'
  | 'charterLocks'
  | 'charterActive'
  | 'fundingLit'
  | 'gavelHit'
  | 'precedentSpins'
  | 'wizardLocked'
  | 'wizardActive'
  | 'levelsVisitedThisBall'
  | 'activeModeName'
  | 'modeTimers'
  | 'multiplier'
  | 'tilted'
  | 'tiltWarnings'
  | 'ballInLane'
  | 'plungerCharge'
  | 'launched'
> => ({
  tableLetters: [false, false, false, false, false],
  recruitLit: false,
  recruitActive: false,
  orbitSpinCount: 0,
  preacherStreak: 0,
  preacherMultiplier: 1,
  budgetLetters: [false, false, false, false, false, false],
  charterLocks: 0,
  charterActive: false,
  fundingLit: false,
  gavelHit: false,
  precedentSpins: 0,
  wizardLocked: false,
  wizardActive: false,
  levelsVisitedThisBall: new Set(),
  activeModeName: null,
  modeTimers: [],
  multiplier: 1,
  tilted: false,
  tiltWarnings: 0,
  ballInLane: false,
  plungerCharge: 0,
  launched: false,
})

export const useGameStore = createStore<GameState & GameActions>((set, get) => ({
  screen: 'attract',
  score: 0,
  ballNumber: 0,
  ballsInPlay: 0,
  totalBalls: 3,
  ...initialTransient(),
  liveLevel: 1,
  log: [],

  reset() {
    set({ score: 0, ballNumber: 0, ballsInPlay: 0, totalBalls: 3, ...initialTransient(), log: [] })
  },
  startGame() {
    get().reset()
    set({ screen: 'play', ballNumber: 1, ballsInPlay: 1 })
  },
  addScore(base, tag) {
    const s = get()
    const mult = s.multiplier * s.preacherMultiplier * (s.wizardActive ? 1 : 1)
    const awarded = Math.round(base * mult)
    set({ score: s.score + awarded })
    if (tag) get().pushLog(`+${awarded} (${tag}, x${mult.toFixed(1)})`)
  },
  setMultiplier(m) {
    set({ multiplier: m })
  },
  markLevelVisited(level) {
    const s = get().levelsVisitedThisBall
    s.add(level)
    set({ levelsVisitedThisBall: new Set(s) })
  },
  pushLog(line) {
    const log = get().log
    log.push(line)
    if (log.length > 500) log.shift()
    set({ log })
  },
}))

export function resetForNewBall(): void {
  useGameStore.setState((s) => ({
    levelsVisitedThisBall: new Set<1 | 2 | 3>(),
    // letters/locks/multiplier persist across balls — only per-ball tracking resets
    multiplier: s.wizardActive ? s.multiplier : 1,
  }))
}
