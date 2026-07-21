import { initRapier, createWorld } from './game/physics/world'
import { buildAllLevels, PLAZA, REITZ, BENCH, levelOfY } from './game/levels'
import { Flipper } from './game/physics/flippers'
import { createBall, resetBall } from './game/physics/ball'
import { startLoop } from './game/loop'
import { input, bindKeyboard, drainProbes, latency } from './game/input'
import { BALL_RADIUS, DT } from './game/scale'
import {
  gate1Scenarios,
  traversalScenario,
  type Scenario,
  type ScenarioCtx,
} from './game/scenarios'
import { createRenderer, createScene, buildTableMeshes, buildBallMesh, buildFlipperMesh } from './render/scene'
import { CameraRig } from './render/camera'
import { buildCabinet } from './render/cabinet'

await initRapier()

const world = createWorld()
const tableDescs = buildAllLevels(world)

// Flippers per level. The two buttons drive every flipper on the machine
// (real multi-playfield behavior); The Bench's single flipper answers both.
const flippers = {
  left: [
    new Flipper(world, 'left', -PLAZA.flipperPivotX, PLAZA.flipperPivotZ),
    new Flipper(world, 'left', -REITZ.flipperPivotX, REITZ.flipperPivotZ, REITZ.y + 1.2, 0.72),
  ],
  right: [
    new Flipper(world, 'right', PLAZA.flipperPivotX, PLAZA.flipperPivotZ),
    new Flipper(world, 'right', REITZ.flipperPivotX, REITZ.flipperPivotZ, REITZ.y + 1.2, 0.72),
  ],
  both: [new Flipper(world, 'left', BENCH.flipperPivotX, BENCH.flipperPivotZ, BENCH.y + 1.2, 0.72)],
}
const allFlippers = [...flippers.left, ...flippers.right, ...flippers.both]

const ball = createBall(world, 0, BALL_RADIUS, 20)

// ---- render ----
const app = document.getElementById('app')!
const renderer = createRenderer(app)
const scene = createScene()
const rig = new CameraRig()
window.addEventListener('resize', () => {
  rig.resize()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
buildTableMeshes(scene, tableDescs)
const ballMesh = buildBallMesh(scene)
const flipperMeshes = allFlippers.map((f) => buildFlipperMesh(scene, f))
const cabinet = buildCabinet(scene)

// ---- stats / debug overlay ----
const debugEl = document.getElementById('debug')!
const showDebug = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_OVERLAY === 'true'
let maxSpeed = 0
let physicsTime = 0

// ---- scenario player (demo mode + number keys) ----
const demoScenarios: Scenario[] = [...gate1Scenarios, traversalScenario]
let activeScenario: Scenario | null = null
let scenarioStart = 0
let scenarioEventIdx = 0
let demoQueue: Scenario[] = []
let demoGapUntil = 0

const scenarioCtx: ScenarioCtx = {
  ball,
  setLeft: (p) => {
    if (p && !input.left) input.probes.push({ side: 'left', at: performance.now(), frame: stats.frame })
    input.left = p
  },
  setRight: (p) => {
    if (p && !input.right) input.probes.push({ side: 'right', at: performance.now(), frame: stats.frame })
    input.right = p
  },
}

function startScenario(s: Scenario): void {
  activeScenario = s
  scenarioStart = physicsTime
  scenarioEventIdx = 0
  input.left = false
  input.right = false
  resetBall(ball, 0, BALL_RADIUS, -10)
}

const params = new URLSearchParams(location.search)
if (params.get('demo') === 'gate1') demoQueue = [...gate1Scenarios]
if (params.get('demo') === 'gate2') demoQueue = [traversalScenario]
if (params.get('demo') === 'all') demoQueue = [...demoScenarios]

// ---- physics step ----
let drainedAt: number | null = null

function step(dt: number): void {
  drainProbes(stats.frame)

  if (!activeScenario && demoQueue.length > 0 && physicsTime >= demoGapUntil) {
    startScenario(demoQueue.shift()!)
  }
  if (activeScenario) {
    const t = physicsTime - scenarioStart
    while (
      scenarioEventIdx < activeScenario.events.length &&
      activeScenario.events[scenarioEventIdx].t <= t
    ) {
      activeScenario.events[scenarioEventIdx].run(scenarioCtx)
      scenarioEventIdx++
    }
    if (t >= activeScenario.duration) {
      activeScenario = null
      input.left = false
      input.right = false
      demoGapUntil = physicsTime + 0.6
    }
  }

  for (const f of flippers.left) f.update(dt, input.left)
  for (const f of flippers.right) f.update(dt, input.right)
  for (const f of flippers.both) f.update(dt, input.left || input.right)
  world.step()
  physicsTime += dt

  const v = ball.linvel()
  const speed = Math.hypot(v.x, v.y, v.z)
  if (speed > maxSpeed) maxSpeed = speed

  // manual launch (Space): approximate plunge up the left lane
  if (input.launch && speed < 40 && !activeScenario) {
    resetBall(ball, -22.6, BALL_RADIUS, 14)
    ball.setLinvel({ x: -10, y: 0, z: -550 }, true)
  }

  // drain: respawn in manual play (Plaza only — upper levels drain by falling)
  const p = ball.translation()
  if (p.z > 41 && p.y < 20 && !activeScenario) {
    drainedAt ??= physicsTime
    if (physicsTime - drainedAt > 0.8) {
      resetBall(ball, 0, BALL_RADIUS, 20)
      drainedAt = null
    }
  } else if (p.z <= 41) {
    drainedAt = null
  }
}

// ---- render frame ----
let lastFrameAt = performance.now()
const stats = startLoop(step, (s) => {
  const now = performance.now()
  const frameDt = Math.min((now - lastFrameAt) / 1000, 0.1)
  lastFrameAt = now

  const p = ball.translation()
  ballMesh.position.set(p.x, p.y, p.z)
  allFlippers.forEach((f, i) => (flipperMeshes[i].rotation.y = f.angle))
  rig.update(p, frameDt)
  cabinet.update(input.left, input.right, frameDt)
  renderer.render(scene, rig.camera)

  if (showDebug) {
    const v = ball.linvel()
    const speed = Math.hypot(v.x, v.y, v.z)
    debugEl.textContent =
      `SWAMP TILT — Gate 2 multilevel rig\n` +
      `fps ${s.fps.toFixed(0)}  substeps ${s.substeps}  physics ${(1 / DT).toFixed(0)} Hz  level L${levelOfY(p.y)}\n` +
      `ball ${speed.toFixed(0)} cm/s (${(speed / 100).toFixed(2)} m/s)  max ${(maxSpeed / 100).toFixed(2)} m/s  y ${p.y.toFixed(1)}\n` +
      `input→flipper latency: ${latency.last ? `${latency.last.ms.toFixed(1)} ms / ${latency.last.frames} frame(s)` : '—'}  worst ${latency.worstFrames}f (${latency.samples} presses)\n` +
      (activeScenario ? `▶ ${activeScenario.label}\n` : '') +
      `L/R-Shift flippers · Space launch · R reset · 1-5 Gate1 · 6 traversal`
  }
})

bindKeyboard(() => stats.frame)
window.addEventListener('keydown', (e) => {
  if (e.repeat) return
  if (e.code === 'KeyR') resetBall(ball, 0, BALL_RADIUS, 20)
  const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code)
  if (idx >= 0 && demoScenarios[idx]) startScenario(demoScenarios[idx])
})
