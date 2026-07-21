/**
 * Gate 1 physics proofs, headless. Runs the exact same modules the browser
 * runs, stepped at the same fixed 240 Hz. `npm run test:gate1`.
 */
import { initRapier, createWorld } from '../src/game/physics/world'
import { buildAllLevels } from '../src/game/levels'
import { Flipper } from '../src/game/physics/flippers'
import { createBall, resetBall } from '../src/game/physics/ball'
import { BALL_RADIUS, DT } from '../src/game/scale'
import {
  cradleScenario,
  postPassScenario,
  orbitScenario,
  strikeScenario,
  bothHeldScenario,
  type Scenario,
  type ScenarioCtx,
} from '../src/game/scenarios'

await initRapier()

interface Rig {
  world: ReturnType<typeof createWorld>
  ball: ReturnType<typeof createBall>
  left: Flipper
  right: Flipper
  pressed: { left: boolean; right: boolean }
  step(): void
  run(seconds: number, onStep?: (t: number) => void): void
  time: number
}

function makeRig(): Rig {
  const world = createWorld()
  buildAllLevels(world)
  const left = new Flipper(world, 'left', -11, 36)
  const right = new Flipper(world, 'right', 11, 36)
  const ball = createBall(world, 0, BALL_RADIUS, 20)
  const pressed = { left: false, right: false }
  const rig: Rig = {
    world,
    ball,
    left,
    right,
    pressed,
    time: 0,
    step() {
      left.update(DT, pressed.left)
      right.update(DT, pressed.right)
      world.step()
      rig.time += DT
    },
    run(seconds, onStep) {
      const n = Math.round(seconds / DT)
      for (let i = 0; i < n; i++) {
        rig.step()
        onStep?.(rig.time)
      }
    },
  }
  return rig
}

function runScenario(rig: Rig, s: Scenario, onStep?: (t: number) => void): void {
  const ctx: ScenarioCtx = {
    ball: rig.ball,
    setLeft: (p) => (rig.pressed.left = p),
    setRight: (p) => (rig.pressed.right = p),
  }
  let idx = 0
  const t0 = rig.time
  rig.run(s.duration, (t) => {
    const rel = t - t0
    while (idx < s.events.length && s.events[idx].t <= rel) {
      s.events[idx].run(ctx)
      idx++
    }
    onStep?.(rel)
  })
}

function speedOf(rig: Rig): number {
  const v = rig.ball.linvel()
  return Math.hypot(v.x, v.y, v.z)
}

/**
 * World-box containment. Since Gate 2 the upper strata are open-topped, so a
 * ball at extreme speed may legally arc above L1's lid via the ramp tubes —
 * "escaped" means outside the whole machine, which only tunneling allows.
 */
function inBounds(p: { x: number; y: number; z: number }): boolean {
  return Math.abs(p.x) <= 30 && p.z >= -55 && p.z <= 48 && p.y >= 0.5 && p.y <= 120
}

let failures = 0
function report(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`)
  if (!ok) failures++
}

// ---------------------------------------------------------------- 1. tunneling
{
  const speeds = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000]
  const dirs = 16
  let maxClean = 0
  let firstFailure: string | null = null
  outer: for (const speed of speeds) {
    for (let d = 0; d < dirs; d++) {
      const a = (2 * Math.PI * d) / dirs
      const rig = makeRig()
      resetBall(rig.ball, 0, BALL_RADIUS, 0)
      rig.ball.setLinvel({ x: speed * Math.cos(a), y: 0, z: speed * Math.sin(a) }, true)
      let escaped = false
      rig.run(2.0, () => {
        if (!escaped && !inBounds(rig.ball.translation())) escaped = true
      })
      if (escaped) {
        firstFailure = `${(speed / 100).toFixed(1)} m/s at ${((a * 180) / Math.PI).toFixed(0)}°`
        break outer
      }
    }
    maxClean = speed
  }
  report(
    'no tunneling',
    maxClean >= 3000,
    `clean up to ${(maxClean / 100).toFixed(0)} m/s × ${dirs} directions × 2 s each` +
      (firstFailure ? `; first escape at ${firstFailure}` : '; never escaped'),
  )
}

// ------------------------------------------------------------------ 2. cradle
{
  const rig = makeRig()
  runScenario(rig, cradleScenario)
  const p = rig.ball.translation()
  const s = speedOf(rig)
  const ok = s < 8 && p.x > -15 && p.x < -2 && p.z > 27 && p.z < 39
  report(
    'catch + cradle',
    ok,
    `ball at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}), speed ${s.toFixed(1)} cm/s after ${cradleScenario.duration}s with flipper held`,
  )
}

// --------------------------------------------------------------- 3. post-pass
{
  const rig = makeRig()
  runScenario(rig, postPassScenario)
  const p = rig.ball.translation()
  const s = speedOf(rig)
  const ok = p.x > 1 && p.x < 16 && p.z > 26 && p.z < 40 && s < 40
  report(
    'post-pass',
    ok,
    `ball ended at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}), speed ${s.toFixed(1)} cm/s (want: resting near right flipper)`,
  )
}

// ------------------------------------------------------------------- 4. orbit
{
  const rig = makeRig()
  let reachedTop = false
  let cameDownRight = false
  let returnedLow = false
  let returnSpeed = 0
  runScenario(rig, orbitScenario, () => {
    const p = rig.ball.translation()
    if (p.z < -40) reachedTop = true
    if (reachedTop && p.x > 19 && p.z > -20) cameDownRight = true
    if (cameDownRight && p.z > 15 && !returnedLow) {
      returnedLow = true
      returnSpeed = speedOf(rig)
    }
  })
  report(
    'orbit shot returns cleanly',
    reachedTop && cameDownRight && returnedLow,
    `top=${reachedTop} rightLane=${cameDownRight} returned=${returnedLow}` +
      (returnedLow ? `, re-entry speed ${(returnSpeed / 100).toFixed(2)} m/s` : ''),
  )
}

// --------------------------------------------------- 5. flipper strike power
{
  const rig = makeRig()
  let peak = 0
  runScenario(rig, strikeScenario, () => {
    peak = Math.max(peak, speedOf(rig))
  })
  const p = rig.ball.translation()
  report(
    'full-power flip',
    peak > 300 && inBounds(p),
    `peak ball speed off flipper ${(peak / 100).toFixed(2)} m/s, ball still in bounds`,
  )
}

// -------------------------------------------------- 6. both-held independence
{
  const rig = makeRig()
  const angleAt: Record<string, { l: number; r: number }> = {}
  runScenario(rig, bothHeldScenario, (t) => {
    for (const probe of [0.7, 1.5, 2.1]) {
      if (Math.abs(t - probe) < DT / 2) angleAt[probe.toFixed(1)] = { l: rig.left.angle, r: rig.right.angle }
    }
  })
  const near = (a: number, b: number) => Math.abs(a - b) < 0.03
  const at07 = angleAt['0.7'] // left held, right just pressed... right pressed at 0.8 — at 0.7 right still rest
  const at15 = angleAt['1.5'] // both held
  const at21 = angleAt['2.1'] // left released at 1.8, right still held
  const ok =
    !!at07 && near(at07.l, rig.left.endAngle) && near(at07.r, rig.right.restAngle) &&
    !!at15 && near(at15.l, rig.left.endAngle) && near(at15.r, rig.right.endAngle) &&
    !!at21 && near(at21.l, rig.left.restAngle) && near(at21.r, rig.right.endAngle)
  report(
    'both buttons held / independence',
    ok,
    `t=0.7 L up R rest: ${at07 ? `${at07.l.toFixed(2)}/${at07.r.toFixed(2)}` : 'missed'}; ` +
      `t=1.5 both up: ${at15 ? `${at15.l.toFixed(2)}/${at15.r.toFixed(2)}` : 'missed'}; ` +
      `t=2.1 L rest R up: ${at21 ? `${at21.l.toFixed(2)}/${at21.r.toFixed(2)}` : 'missed'}`,
  )
}

console.log(failures === 0 ? '\nGate 1 physics: ALL PASS' : `\nGate 1 physics: ${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
