import type { ReactElement } from 'react'
import { useGame } from './hooks'

const LEVEL_NAMES = { 1: 'Turlington Plaza', 2: 'The Reitz', 3: 'The Bench' } as const

export function HUD(): ReactElement {
  const score = useGame((s) => s.score)
  const ballNumber = useGame((s) => s.ballNumber)
  const totalBalls = useGame((s) => s.totalBalls)
  const multiplier = useGame((s) => s.multiplier * s.preacherMultiplier)
  const level = useGame((s) => s.liveLevel)
  const modeName = useGame((s) => s.activeModeName)
  const timers = useGame((s) => s.modeTimers)
  const tilted = useGame((s) => s.tilted)

  const timer = timers[0]

  return (
    <>
      <div className="st-hud">
        <span className="st-dmd">SCORE {score.toLocaleString()}</span>
        <span className="st-dmd">
          BALL {ballNumber}/{totalBalls} · {LEVEL_NAMES[level]} · x{multiplier}
        </span>
      </div>
      {(modeName || tilted) && (
        <div className="st-hud-mode">
          {tilted ? 'TILT' : modeName}
          {timer ? ` · ${Math.max(0, Math.ceil(timer.secondsLeft))}s` : ''}
        </div>
      )}
    </>
  )
}
