/**
 * Central rules wiring: zones -> state, tilt, multiball starts/ticks, drain
 * and ball-end sequencing. Called once per physics step from both main.ts
 * and the headless Gate 4 proof, so "what happens in the browser" and
 * "what the test asserts" are provably the same code path.
 */
import { type Zone, ZoneTracker } from './zones'
import { useGameStore, resetForNewBall } from './state'
import { BallPool, relaunch } from './multiball'
import { levelOfY } from './levels'
import { BALL_RADIUS } from './scale'
import * as Recruit from './modes/recruitMultiball'
import * as Charter from './modes/charterMultiball'
import * as Wizard from './modes/summaryJudgment'

// ---- zone layout (see zones.ts for why these are circles, not colliders) ----
const TABLE_X = [-16, -8, 0, 8, 16]
const BUDGET_X = [-4, -1, 2, 5, 8, 11]

export const ZONES: Zone[] = [
  ...TABLE_X.map((x, i) => ({ name: `table${i}`, level: 1 as const, x, z: 0, radius: 2.6 })),
  { name: 'leftOrbit', level: 1, x: -22, z: -15, radius: 3 },
  { name: 'rightOrbit', level: 1, x: 22, z: -15, radius: 3 },
  ...BUDGET_X.map((x, i) => ({ name: `budget${i}`, level: 2 as const, x, z: -15, radius: 2.2 })),
  { name: 'bumperCluster', level: 2, x: 0, z: -25, radius: 9 },
  { name: 'filingCabinetLock', level: 2, x: 10, z: -5, radius: 3 },
  { name: 'gavelTarget', level: 3, x: -2, z: -28, radius: 2.5 },
  { name: 'precedentSpinner', level: 3, x: 6, z: -25, radius: 2.5 },
]

const TABLE_LETTERS = ['T', 'A', 'B', 'L', 'E']
const BUDGET_LETTERS = ['B', 'U', 'D', 'G', 'E', 'T']

const ORBIT_DECAY_PER_SEC = 0.5

export class GameLogic {
  readonly pool: BallPool
  private tracker = new ZoneTracker(ZONES)
  private lastLevelById = new Map<number, 1 | 2 | 3>()
  private orbitSpinTimer = 0
  private bumperTimerAccum = 0

  constructor(pool: BallPool) {
    this.pool = pool
  }

  startNewGame(): void {
    useGameStore.getState().startGame()
    this.pool.reset(0, BALL_RADIUS, 20)
    this.autoLaunch()
  }

  /**
   * Placeholder auto-plunge: a real plunger lane (§8, hold-for-power skill
   * shot) is Phase 4/5 work. Until that containment wall exists, a ball
   * spawned at rest mid-field just rolls straight down the tilt into the
   * drain in under a second (found via the Gate 4 proof's 46 s Recruit
   * survive window, which otherwise burned through 49 "balls" this way).
   * A soft assist velocity carries it clear of the drain onto the field.
   */
  private autoLaunch(): void {
    const primary = this.pool.primary()
    if (primary) primary.body.setLinvel({ x: 0, y: 0, z: -230 }, true)
  }

  /** One physics step. Call after world.step(). */
  step(dt: number): void {
    const s = useGameStore.getState()
    if (s.screen !== 'play') return

    const balls = this.pool.balls.map((b) => {
      const p = b.body.translation()
      return { id: b.id, x: p.x, y: p.y, z: p.z }
    })

    // level-visit tracking + Denial kickback flavor log (L2 -> L1 transition)
    for (const b of balls) {
      const lvl = levelOfY(b.y)
      useGameStore.getState().markLevelVisited(lvl)
      const prev = this.lastLevelById.get(b.id)
      if (prev === 2 && lvl === 1) {
        useGameStore.getState().pushLog('Denial kickback — dropped to Plaza, progress held')
      }
      this.lastLevelById.set(b.id, lvl)
    }

    const events = this.tracker.update(balls)
    for (const ev of events) this.handleZoneEnter(ev.zone.name)

    // orbit spin decay
    this.orbitSpinTimer += dt
    if (this.orbitSpinTimer >= 1) {
      this.orbitSpinTimer = 0
      const cur = useGameStore.getState().orbitSpinCount
      if (cur > 0) useGameStore.setState({ orbitSpinCount: Math.max(0, cur - ORBIT_DECAY_PER_SEC) })
    }

    // bumper-cluster-gated mode timer (only ticks while a ball is in the cluster)
    if (this.tracker.isOccupied('bumperCluster')) {
      this.bumperTimerAccum += dt
    }

    // Drains must resolve BEFORE the mode ticks check liveCount — otherwise
    // a mode-ending drain on this exact step is invisible until the NEXT
    // step (tickCharter etc. would see the stale pre-drain ball count and
    // wait one extra frame to notice the multiball is down to 1). Harmless
    // in real-time play (one frame at 240 Hz) but broke a headless test
    // that only stepped once (Gate 4 finding).
    this.checkDrains(balls)

    Recruit.tickRecruit(dt, this.pool)
    Charter.tickCharter(this.pool)
    Wizard.tickWizard(this.pool)
  }

  private handleZoneEnter(name: string): void {
    const s = useGameStore.getState()

    const tableIdx = TABLE_LETTERS.findIndex((_, i) => name === `table${i}`)
    if (tableIdx >= 0) {
      const letters = [...s.tableLetters]
      if (!letters[tableIdx]) {
        letters[tableIdx] = true
        useGameStore.setState({ tableLetters: letters })
        s.addScore(5_000, `TABLE: ${TABLE_LETTERS[tableIdx]}`)
        Recruit.lightRecruit()
      }
      return
    }
    const budgetIdx = BUDGET_LETTERS.findIndex((_, i) => name === `budget${i}`)
    if (budgetIdx >= 0) {
      const letters = [...s.budgetLetters]
      if (!letters[budgetIdx]) {
        letters[budgetIdx] = true
        useGameStore.setState({ budgetLetters: letters, fundingLit: letters.every(Boolean) })
        s.addScore(6_000, `BUDGET: ${BUDGET_LETTERS[budgetIdx]}`)
      }
      return
    }

    switch (name) {
      case 'leftOrbit': {
        const spins = s.orbitSpinCount + 1
        useGameStore.setState({ orbitSpinCount: spins })
        s.addScore(1_000 * Math.min(spins, 10), 'Flyer spinner')
        break
      }
      case 'rightOrbit': {
        if (s.recruitLit) {
          Recruit.startRecruit(this.pool)
          break
        }
        const streak = s.preacherStreak + 1
        const mult = streak >= 3 ? Math.min(s.preacherMultiplier + 1, 8) : s.preacherMultiplier
        useGameStore.setState({ preacherStreak: streak, preacherMultiplier: mult })
        s.addScore(2_500, `Preacher loop x${streak}`)
        break
      }
      case 'filingCabinetLock':
        Charter.registerLock()
        Charter.startCharter(this.pool)
        break
      case 'gavelTarget':
        if (!s.gavelHit) {
          useGameStore.setState({ gavelHit: true })
          s.addScore(8_000, 'Gavel')
        } else {
          Wizard.lockUnderGavel()
          Wizard.startWizard(this.pool)
        }
        break
      case 'precedentSpinner': {
        const spins = s.precedentSpins + 1
        useGameStore.setState({ precedentSpins: spins })
        s.addScore(1_500, 'Precedent spinner')
        break
      }
    }
  }

  private checkDrains(balls: { id: number; x: number; y: number; z: number }[]): void {
    for (const pb of [...this.pool.balls]) {
      const p = pb.body.translation()
      const drained = p.z > 41 && p.y < 20 // past the Plaza drain wall, at field height
      if (!drained) continue

      if (this.pool.liveCount > 1) {
        // multiball: this ball is out, others keep going
        this.pool.remove(pb)
        useGameStore.setState({ preacherStreak: 0, preacherMultiplier: 1 })
        continue
      }

      // last ball drains: end this ball
      this.pool.remove(pb)
      useGameStore.setState({ preacherStreak: 0, preacherMultiplier: 1 })
      this.endBall()
    }
    void balls
  }

  private endBall(): void {
    const s = useGameStore.getState()
    if (s.ballNumber >= s.totalBalls) {
      useGameStore.setState({ screen: 'gameOver' })
      s.pushLog(`GAME OVER — final score ${s.score}`)
      return
    }
    resetForNewBall()
    useGameStore.setState((st) => ({ ballNumber: st.ballNumber + 1, ballsInPlay: 1 }))
    this.pool.spawn(0, BALL_RADIUS, 20)
    this.autoLaunch()
    useGameStore.getState().pushLog(`Ball ${useGameStore.getState().ballNumber}`)
  }

  /** Manual relaunch helper for tests/UI (plunger is Phase 4). */
  relaunchPrimary(vz: number): void {
    const primary = this.pool.primary()
    if (primary) relaunch(primary, 0, BALL_RADIUS, 20, vz)
  }
}
