import { initRapier, createWorld } from './game/physics/world'
import { buildGate1Table, TABLE } from './game/physics/colliders'
import { Flipper, FLIPPER } from './game/physics/flippers'
import { createBall, resetBall } from './game/physics/ball'
import { startLoop } from './game/loop'
import { input, bindKeyboard, drainProbes, latency } from './game/input'
import { BALL_RADIUS, DT } from './game/scale'
import { gate1Scenarios, type Scenario, type ScenarioCtx } from './game/scenarios'
import { createRenderer, createScene, buildTableMeshes, buildBallMesh, buildFlipperMesh } from './render/scene'
import { createCamera, handleResize } from './render/camera'
import { buildCabinet } from './render/cabinet'

await initRapier()

const world = createWorld()
const tableDescs = buildGate1Table(world)
const left = new Flipper(world, 'left', -TABLE.flipperPivotX, TABLE.flipperPivotZ)
const right = new Flipper(world, 'right', TABLE.flipperPivotX, TABLE.flipperPivotZ)
const ball = createBall(world, 0, BALL_RADIUS, 20)

// ---- render ----
const app = document.getElementById('app')!
const renderer = createRenderer(app)
const scene = createScene()
const camera = createCamera()
handleResize(camera, renderer)
buildTableMeshes(scene, tableDescs)
const ballMesh = buildBallMesh(scene)
const leftMesh = buildFlipperMesh(scene, 'left', -TABLE.flipperPivotX, FLIPPER.y, TABLE.flipperPivotZ)
const rightMesh = buildFlipperMesh(scene, 'right', TABLE.flipperPivotX, FLIPPER.y, TABLE.flipperPivotZ)
const cabinet = buildCabinet(scene)

// ---- stats / debug overlay ----
const debugEl = document.getElementById('debug')!
const showDebug = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_OVERLAY === 'true'
let maxSpeed = 0
let physicsTime = 0

// ---- scenario player (demo mode + number keys) ----
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
if (params.get('demo') === 'gate1') {
  demoQueue = [...gate1Scenarios]
}

// ---- physics step ----
let drainedAt: number | null = null

function step(dt: number): void {
  drainProbes(stats.frame)

  // scenario scheduling runs on physics time so it's deterministic
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

  left.update(dt, input.left)
  right.update(dt, input.right)
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

  // drain: respawn in manual play
  const p = ball.translation()
  if (p.z > 41 && !activeScenario) {
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
const stats = startLoop(step, (s) => {
  const p = ball.translation()
  ballMesh.position.set(p.x, p.y, p.z)
  leftMesh.rotation.y = left.angle
  rightMesh.rotation.y = right.angle
  cabinet.update(input.left, input.right, 1 / Math.max(s.fps, 30))
  renderer.render(scene, camera)

  if (showDebug) {
    const v = ball.linvel()
    const speed = Math.hypot(v.x, v.y, v.z)
    debugEl.textContent =
      `SWAMP TILT — Gate 1 physics rig\n` +
      `fps ${s.fps.toFixed(0)}  substeps ${s.substeps}  physics ${(1 / DT).toFixed(0)} Hz\n` +
      `ball ${speed.toFixed(0)} cm/s (${(speed / 100).toFixed(2)} m/s)  max ${(maxSpeed / 100).toFixed(2)} m/s\n` +
      `input→flipper latency: ${latency.last ? `${latency.last.ms.toFixed(1)} ms / ${latency.last.frames} frame(s)` : '—'}  worst ${latency.worstFrames}f (${latency.samples} presses)\n` +
      (activeScenario ? `▶ ${activeScenario.label}\n` : '') +
      `L-Shift / R-Shift flippers · Space launch · R reset · 1-5 scenarios`
  }
})

bindKeyboard(() => stats.frame)
window.addEventListener('keydown', (e) => {
  if (e.repeat) return
  if (e.code === 'KeyR') resetBall(ball, 0, BALL_RADIUS, 20)
  const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code)
  if (idx >= 0 && gate1Scenarios[idx]) startScenario(gate1Scenarios[idx])
})
