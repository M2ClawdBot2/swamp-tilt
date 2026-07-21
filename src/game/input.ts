/**
 * Input goes straight to the physics loop — React never touches flipper
 * state. The physics loop reads these flags fresh every 240 Hz substep.
 *
 * Latency probe: keydown stamps performance.now() + current render frame;
 * the main loop clears the probe on the first physics substep that consumes
 * the press and records elapsed ms / render frames.
 */
export interface PressProbe {
  side: 'left' | 'right'
  at: number // performance.now() at the DOM event
  frame: number // render frame counter at the DOM event
}

export const input = {
  left: false,
  right: false,
  launch: false,
  probes: [] as PressProbe[],
}

export interface LatencySample {
  ms: number
  frames: number
}

export const latency = {
  last: null as LatencySample | null,
  worstFrames: 0,
  samples: 0,
}

export function bindKeyboard(getFrame: () => number): void {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return
    if (e.code === 'ShiftLeft') {
      input.left = true
      input.probes.push({ side: 'left', at: performance.now(), frame: getFrame() })
      e.preventDefault()
    } else if (e.code === 'ShiftRight') {
      input.right = true
      input.probes.push({ side: 'right', at: performance.now(), frame: getFrame() })
      e.preventDefault()
    } else if (e.code === 'Space') {
      input.launch = true
      e.preventDefault()
    }
  })
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ShiftLeft') input.left = false
    else if (e.code === 'ShiftRight') input.right = false
    else if (e.code === 'Space') input.launch = false
  })
}

/** Called by the physics loop when it consumes pending presses. */
export function drainProbes(currentFrame: number): void {
  for (const p of input.probes) {
    const ms = performance.now() - p.at
    const frames = currentFrame - p.frame
    latency.last = { ms, frames }
    latency.worstFrames = Math.max(latency.worstFrames, frames)
    latency.samples++
  }
  input.probes.length = 0
}
