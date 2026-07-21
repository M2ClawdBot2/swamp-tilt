/**
 * SUMMARY JUDGMENT — the wizard mode. Locked under the gavel on The Bench.
 * All three playfields live, 6 balls (4 on mobile — perf fallback per the
 * build prompt's §12 honest scope note), every shot scores. Ends at 1 ball;
 * award = points scored during the mode × distinct levels visited this ball.
 */
import type { BallPool } from '../multiball'
import { useGameStore } from '../state'
import { BENCH } from '../levels'

export const WIZARD = {
  ballCountDesktop: 6,
  ballCountMobile: 4,
} as const

let accumulatedDuringWizard = 0
let isMobile = false

export function setMobile(mobile: boolean): void {
  isMobile = mobile
}

export function lockUnderGavel(): void {
  const s = useGameStore.getState()
  if (s.wizardLocked || s.wizardActive) return
  if (!s.gavelHit) return
  useGameStore.setState({ wizardLocked: true })
  s.pushLog('SUMMARY JUDGMENT locked — one more shot')
}

export function startWizard(pool: BallPool): boolean {
  const s = useGameStore.getState()
  if (!s.wizardLocked || s.wizardActive) return false
  const count = isMobile ? WIZARD.ballCountMobile : WIZARD.ballCountDesktop
  accumulatedDuringWizard = 0
  useGameStore.setState({
    wizardActive: true,
    wizardLocked: false,
    activeModeName: 'Summary Judgment',
  })
  s.pushLog(`SUMMARY JUDGMENT — ${count} balls, everything scores`)
  while (pool.liveCount < count) {
    pool.spawn(-6 + (pool.liveCount % 4) * 4, BENCH.y + 3, -25)
  }
  return true
}

/** Score awarded while the wizard is active should route through this so the final award can total it. */
export function trackWizardScore(amount: number): void {
  if (useGameStore.getState().wizardActive) accumulatedDuringWizard += amount
}

export function tickWizard(pool: BallPool): boolean {
  const s = useGameStore.getState()
  if (!s.wizardActive) return false
  if (pool.liveCount <= 1) {
    const levels = s.levelsVisitedThisBall.size || 1
    const award = accumulatedDuringWizard * levels
    useGameStore.setState({ wizardActive: false, activeModeName: null })
    s.addScore(award, `SUMMARY JUDGMENT award (${levels} level${levels === 1 ? '' : 's'})`)
    s.pushLog('SUMMARY JUDGMENT ends')
    accumulatedDuringWizard = 0
    return true
  }
  return false
}
