/**
 * Gate 2 proofs, headless: physical multilevel traversal. Same modules the
 * browser runs, 240 Hz. `npm run test:gate2`.
 */
import { initRapier, createWorld } from '../src/game/physics/world'
import { buildAllLevels, PLAZA, REITZ, BENCH } from '../src/game/levels'
import { Flipper } from '../src/game/physics/flippers'
import { createBall, resetBall } from '../src/game/physics/ball'
import { BALL_RADIUS, DT } from '../src/game/scale'
import { traversalScenario, type ScenarioCtx } from '../src/game/scenarios'

await initRapier()

function makeRig() {
  const world = createWorld()
  buildAllLevels(world)
  // all flippers exist and rest — traversal must work with nobody flipping
  new Flipper(world, 'left', -PLAZA.flipperPivotX, PLAZA.flipperPivotZ)
  new Flipper(world, 'right', PLAZA.flipperPivotX, PLAZA.flipperPivotZ)
  new Flipper(world, 'left', -REITZ.flipperPivotX, REITZ.flipperPivotZ, REITZ.y + 1.2, 0.72)
  new Flipper(world, 'right', REITZ.flipperPivotX, REITZ.flipperPivotZ, REITZ.y + 1.2, 0.72)
  new Flipper(world, 'left', BENCH.flipperPivotX, BENCH.flipperPivotZ, BENCH.y + 1.2, 0.72)
  const ball = createBall(world, 0, BALL_RADIUS, 20)
  let t = 0
  const step = () => {
    world.step()
    t += DT
  }
  return { world, ball, step, time: () => t }
}

const onL2 = (p: { y: number; z: number }) => p.y > 40.5 && p.y < 46 && p.z > -44 && p.z < 10
const onL3 = (p: { y: number; z: number }) => p.y > 80.5 && p.y < 86 && p.z > -40 && p.z < -12
const onL1 = (p: { y: number }) => p.y < 5

let failures = 0
function report(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`)
  if (!ok) failures++
}

// ------------------------------------------------- full traversal cascade
{
  const rig = makeRig()
  const ctx: ScenarioCtx = { ball: rig.ball, setLeft: () => {}, setRight: () => {} }
  const times: Record<string, number> = {}
  let idx = 0
  let phase = 0 // 0: want L2, 1: want fall→L1, 2: want L3, 3: want L2, 4: want L1
  const n = Math.round(traversalScenario.duration / DT)
  for (let i = 0; i < n; i++) {
    rig.step()
    const t = rig.time()
    while (idx < traversalScenario.events.length && traversalScenario.events[idx].t <= t) {
      traversalScenario.events[idx].run(ctx)
      idx++
    }
    const p = rig.ball.translation()
    if (phase === 0 && onL2(p)) (times.rampToL2 = t), phase++
    else if (phase === 1 && onL1(p)) (times.fallToL1 = t), phase++
    else if (phase === 2 && t > 10 && onL3(p)) (times.rampToL3 = t), phase++
    else if (phase === 3 && onL2(p)) (times.benchFallToL2 = t), phase++
    else if (phase === 4 && onL1(p)) (times.cascadeToL1 = t), phase++
  }
  report(
    'physical traversal L1→L2→(fall)→L1, L2→L3→(fall)→L2→(fall)→L1',
    phase === 5,
    `milestones: ${JSON.stringify(times)} (phase ${phase}/5)`,
  )
}

// ------------------------------------------------- weak L1 ramp shot rolls back
{
  const rig = makeRig()
  resetBall(rig.ball, 12, BALL_RADIUS, 16)
  rig.ball.setLinvel({ x: 0, y: 0, z: -350 }, true)
  let peakY = 0
  let crested = false
  for (let i = 0; i < Math.round(5 / DT); i++) {
    rig.step()
    const q = rig.ball.translation()
    peakY = Math.max(peakY, q.y)
    if (onL2(q)) crested = true
  }
  const p = rig.ball.translation()
  const ok = !crested && p.y < 5
  report(
    'weak ramp shot rolls back to Plaza',
    ok,
    `peak y ${peakY.toFixed(1)} (in-tube), never crested=${!crested}, ended (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`,
  )
}

// ------------------------------------------------- weak L2 ramp shot stays on Reitz
{
  const rig = makeRig()
  resetBall(rig.ball, -11, REITZ.y + BALL_RADIUS, 1)
  rig.ball.setLinvel({ x: 0, y: 0, z: -380 }, true)
  let peakY = 0
  for (let i = 0; i < Math.round(6 / DT); i++) {
    rig.step()
    peakY = Math.max(peakY, rig.ball.translation().y)
  }
  const p = rig.ball.translation()
  const ok = peakY < 70 && (onL2(p) || onL1(p))
  report(
    'weak Bench shot returns to Reitz (or falls home)',
    ok,
    `peak y ${peakY.toFixed(1)}, ended (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`,
  )
}

console.log(failures === 0 ? '\nGate 2 physics: ALL PASS' : `\nGate 2 physics: ${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
