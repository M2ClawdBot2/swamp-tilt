/**
 * Fixed-timestep accumulator loop. Physics at 240 Hz regardless of display
 * refresh; render runs once per rAF with the freshest physics state.
 * Pinball at 60 Hz physics is mush — this is not optional.
 */
import { DT } from './scale'

export interface LoopStats {
  /** render frames since start */
  frame: number
  /** physics substeps executed last render frame */
  substeps: number
  fps: number
}

export function startLoop(
  stepFn: (dt: number) => void,
  renderFn: (stats: LoopStats) => void,
): LoopStats {
  const stats: LoopStats = { frame: 0, substeps: 0, fps: 0 }
  let last = performance.now()
  let acc = 0
  let fpsWindowStart = last
  let fpsFrames = 0

  function frame(now: number): void {
    let ft = (now - last) / 1000
    last = now
    if (ft > 0.25) ft = 0.25 // tab-switch guard: don't spiral

    acc += ft
    let steps = 0
    while (acc >= DT && steps < 120) {
      stepFn(DT)
      acc -= DT
      steps++
    }
    stats.substeps = steps
    stats.frame++

    fpsFrames++
    if (now - fpsWindowStart >= 500) {
      stats.fps = (fpsFrames * 1000) / (now - fpsWindowStart)
      fpsWindowStart = now
      fpsFrames = 0
    }

    renderFn(stats)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  return stats
}
