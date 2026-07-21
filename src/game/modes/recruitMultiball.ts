/**
 * L1 — Recruit Multiball. Lit by completing T-A-B-L-E, started by the next
 * shot through the right orbit (the preacher loop shot doubles as the
 * start — no separate scoop needed). 3 balls, survive 45 s.
 */
import type { BallPool } from '../multiball'
import { useGameStore } from '../state'
import { PLAZA } from '../levels'

export const RECRUIT = {
  durationSeconds: 45,
  ballCount: 3,
  perBallBonus: 50_000,
} as const

export function tableComplete(): boolean {
  return useGameStore.getState().tableLetters.every(Boolean)
}

export function lightRecruit(): void {
  const s = useGameStore.getState()
  if (!s.recruitLit && tableComplete()) {
    useGameStore.setState({ recruitLit: true })
    s.pushLog('RECRUIT lit — hit the preacher loop')
  }
}

export function startRecruit(pool: BallPool): void {
  const s = useGameStore.getState()
  if (!s.recruitLit || s.recruitActive) return
  useGameStore.setState({
    recruitLit: false,
    recruitActive: true,
    activeModeName: 'Recruit Multiball',
    modeTimers: [{ name: 'Recruit Multiball', secondsLeft: RECRUIT.durationSeconds, ticksOnlyInZone: null }],
  })
  s.pushLog('RECRUIT MULTIBALL — 3 balls, 45s')
  while (pool.liveCount < RECRUIT.ballCount) {
    pool.spawn(-6 + pool.liveCount * 6, 3, -20)
  }
}

/** Called once per physics step while active. Returns true if the mode just ended. */
export function tickRecruit(dt: number, pool: BallPool): boolean {
  const s = useGameStore.getState()
  if (!s.recruitActive) return false

  const timers = s.modeTimers.map((t) =>
    t.name === 'Recruit Multiball' ? { ...t, secondsLeft: t.secondsLeft - dt } : t,
  )
  const timer = timers.find((t) => t.name === 'Recruit Multiball')
  useGameStore.setState({ modeTimers: timers })

  const timeUp = (timer?.secondsLeft ?? 0) <= 0
  const drained = pool.liveCount <= 1
  if (timeUp || drained) {
    useGameStore.setState({
      recruitActive: false,
      activeModeName: null,
      modeTimers: s.modeTimers.filter((t) => t.name !== 'Recruit Multiball'),
    })
    s.addScore(RECRUIT.perBallBonus, 'Recruit survived')
    s.pushLog(`RECRUIT MULTIBALL ends (${timeUp ? 'timer' : 'drained'})`)
    return true
  }
  return false
}

export { PLAZA }
