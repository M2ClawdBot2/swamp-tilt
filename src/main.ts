import * as THREE from 'three'
import { initRapier, createWorld } from './game/physics/world'
import { buildAllLevels, PLAZA, REITZ, BENCH, levelOfY } from './game/levels'
import { Flipper } from './game/physics/flippers'
import { resetBall } from './game/physics/ball'
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
import { GameLogic } from './game/gameLogic'
import { BallPool } from './game/multiball'
import { useGameStore } from './game/state'
import { registerNudge, nudgeImpulse, resetTilt } from './game/tilt'

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

const logic = new GameLogic(new BallPool(world))
logic.pool.spawn(0, BALL_RADIUS, 20) // default single ball for the physics-only demos

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
const flipperMeshes = allFlippers.map((f) => buildFlipperMesh(scene, f))
const cabinet = buildCabinet(scene)

const ballMeshes = new Map<number, THREE.Mesh>()
function syncBallMeshes(): void {
  const liveIds = new Set(logic.pool.balls.map((b) => b.id))
  for (const [id, mesh] of ballMeshes) {
    if (!liveIds.has(id)) {
      scene.remove(mesh)
      ballMeshes.delete(id)
    }
  }
  for (const b of logic.pool.balls) {
    if (!ballMeshes.has(b.id)) ballMeshes.set(b.id, buildBallMesh(scene))
  }
}
syncBallMeshes()

// ---- stats / debug overlay ----
const debugEl = document.getElementById('debug')!
const showDebug = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_OVERLAY === 'true'
let maxSpeed = 0
let physicsTime = 0

// ---- scenario player (demo mode + number keys) — physics-only, no rules ----
const demoScenarios: Scenario[] = [...gate1Scenarios, traversalScenario]
let activeScenario: Scenario | null = null
let scenarioStart = 0
let scenarioEventIdx = 0
let demoQueue: Scenario[] = []
let demoGapUntil = 0
let playingRealGame = false

const scenarioCtx: ScenarioCtx = {
  get ball() {
    return logic.pool.primary()!.body
  },
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
  resetBall(scenarioCtx.ball, 0, BALL_RADIUS, -10)
}

function startRealGame(): void {
  activeScenario = null
  demoQueue = []
  playingRealGame = true
  resetTilt()
  logic.startNewGame()
  syncBallMeshes()
}

const params = new URLSearchParams(location.search)
if (params.get('demo') === 'gate1') demoQueue = [...gate1Scenarios]
if (params.get('demo') === 'gate2') demoQueue = [traversalScenario]
if (params.get('demo') === 'all') demoQueue = [...demoScenarios]
if (params.get('demo') === 'game') startRealGame()

// ---- physics step ----
let drainedAt: number | null = null

function step(dt: number): void {
  drainProbes(stats.frame)

  if (!playingRealGame) {
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
  }

  for (const f of flippers.left) f.update(dt, input.left)
  for (const f of flippers.right) f.update(dt, input.right)
  for (const f of flippers.both) f.update(dt, input.left || input.right)
  world.step()
  physicsTime += dt

  if (playingRealGame) {
    logic.step(dt)
    if (logic.pool.balls.length !== ballMeshes.size) syncBallMeshes()
  }

  const primary = logic.pool.primary()
  if (primary) {
    const v = primary.body.linvel()
    const speed = Math.hypot(v.x, v.y, v.z)
    if (speed > maxSpeed) maxSpeed = speed
  }

  if (!playingRealGame) {
    // manual launch (Space): approximate plunge up the left lane
    const p = scenarioCtx.ball.translation()
    const v = scenarioCtx.ball.linvel()
    const speed = Math.hypot(v.x, v.y, v.z)
    if (input.launch && speed < 40 && !activeScenario) {
      resetBall(scenarioCtx.ball, -22.6, BALL_RADIUS, 14)
      scenarioCtx.ball.setLinvel({ x: -10, y: 0, z: -550 }, true)
    }
    // drain: respawn in manual play (Plaza only — upper levels drain by falling)
    if (p.z > 41 && p.y < 20 && !activeScenario) {
      drainedAt ??= physicsTime
      if (physicsTime - drainedAt > 0.8) {
        resetBall(scenarioCtx.ball, 0, BALL_RADIUS, 20)
        drainedAt = null
      }
    } else if (p.z <= 41) {
      drainedAt = null
    }
  }
}

// ---- render frame ----
let lastFrameAt = performance.now()
const stats = startLoop(step, (s) => {
  const now = performance.now()
  const frameDt = Math.min((now - lastFrameAt) / 1000, 0.1)
  lastFrameAt = now

  for (const b of logic.pool.balls) {
    const p = b.body.translation()
    const mesh = ballMeshes.get(b.id)
    if (mesh) mesh.position.set(p.x, p.y, p.z)
  }
  allFlippers.forEach((f, i) => (flipperMeshes[i].rotation.y = f.angle))
  const primaryPos = logic.pool.primary()?.body.translation() ?? { x: 0, y: 1.3, z: 20 }
  rig.update(primaryPos, frameDt)
  cabinet.update(input.left, input.right, frameDt)
  renderer.render(scene, rig.camera)

  if (showDebug) {
    const gs = useGameStore.getState()
    const v = logic.pool.primary()?.body.linvel() ?? { x: 0, y: 0, z: 0 }
    const speed = Math.hypot(v.x, v.y, v.z)
    let text =
      `SWAMP TILT — ${playingRealGame ? 'live game' : 'Gate 1/2 physics rig'}\n` +
      `fps ${s.fps.toFixed(0)}  substeps ${s.substeps}  physics ${(1 / DT).toFixed(0)} Hz  level L${levelOfY(primaryPos.y)}\n` +
      `ball ${speed.toFixed(0)} cm/s (${(speed / 100).toFixed(2)} m/s)  max ${(maxSpeed / 100).toFixed(2)} m/s  balls ${logic.pool.liveCount}\n` +
      `input→flipper latency: ${latency.last ? `${latency.last.ms.toFixed(1)} ms / ${latency.last.frames} frame(s)` : '—'}  worst ${latency.worstFrames}f (${latency.samples} presses)\n`
    if (playingRealGame) {
      text +=
        `score ${gs.score.toLocaleString()}  ball ${gs.ballNumber}/${gs.totalBalls}  ${gs.screen}` +
        `${gs.tilted ? '  TILTED' : ''}\n` +
        `TABLE ${gs.tableLetters.map((x) => (x ? '●' : '○')).join('')}  BUDGET ${gs.budgetLetters.map((x) => (x ? '●' : '○')).join('')}  gavel ${gs.gavelHit ? '●' : '○'}\n` +
        `${gs.activeModeName ? `▶ ${gs.activeModeName}` : ''}\n` +
        `L/R-Shift flippers · Space launch · Arrows nudge · N new game`
    } else {
      text +=
        (activeScenario ? `▶ ${activeScenario.label}\n` : '') +
        `L/R-Shift flippers · Space launch · R reset · 1-5 Gate1 · 6 traversal · N real game`
    }
    debugEl.textContent = text
  }
})

bindKeyboard(() => stats.frame)
window.addEventListener('keydown', (e) => {
  if (e.repeat) return
  if (e.code === 'KeyN') startRealGame()
  if (!playingRealGame) {
    if (e.code === 'KeyR') resetBall(scenarioCtx.ball, 0, BALL_RADIUS, 20)
    const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code)
    if (idx >= 0 && demoScenarios[idx]) startScenario(demoScenarios[idx])
  } else {
    const dir = e.code === 'ArrowLeft' ? 'left' : e.code === 'ArrowRight' ? 'right' : e.code === 'ArrowUp' ? 'up' : null
    if (dir) {
      const imp = nudgeImpulse(dir)
      for (const b of logic.pool.balls) {
        const v = b.body.linvel()
        b.body.setLinvel({ x: v.x + imp.x, y: v.y, z: v.z + imp.z }, true)
      }
      registerNudge(physicsTime)
    }
    if (e.code === 'Space') {
      const primary = logic.pool.primary()
      if (primary) {
        const v = primary.body.linvel()
        if (Math.hypot(v.x, v.y, v.z) < 40) logic.relaunchPrimary(-550)
      }
    }
  }
})
