/**
 * Gate 4 proof, headless: a full game to completion through every mode —
 * TABLE -> Recruit Multiball, BUDGET -> Charter Multiball, Gavel lock ->
 * Summary Judgment, tilt, and game over — with a score log. `npm run
 * test:gate4`.
 *
 * This proves the RULES layer (gameLogic.ts + modes/*): state transitions,
 * scoring, mode start/end conditions. It does not re-prove physical
 * shot-making — Gate 1/2 already did that — so target "hits" are simulated
 * by placing a ball at a zone's (x, y, z) and stepping gameLogic once,
 * rather than scripting an exact flipper shot for all 20+ scoring zones.
 */
import { initRapier, createWorld } from '../src/game/physics/world'
import { buildAllLevels } from '../src/game/levels'
import { GameLogic, ZONES } from '../src/game/gameLogic'
import { BallPool } from '../src/game/multiball'
import { useGameStore } from '../src/game/state'
import { registerNudge, resetTilt } from '../src/game/tilt'
import { DT } from '../src/game/scale'

await initRapier()

const world = createWorld()
buildAllLevels(world)
const logic = new GameLogic(new BallPool(world))

let failures = 0
function report(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`)
  if (!ok) failures++
}

function zone(name: string) {
  const z = ZONES.find((z) => z.name === name)
  if (!z) throw new Error(`no such zone ${name}`)
  return z
}
const yFor = { 1: 1.3, 2: 41.3, 3: 81.3 } as const

/**
 * Move the primary ball onto a zone and step the game logic once. Zone entry
 * is edge-triggered (a ball sitting still in a zone shouldn't re-score every
 * frame), so repeated hits of the SAME zone first cycle the ball far away
 * for a step — otherwise the tracker correctly sees "still inside" and
 * never fires a second enter event.
 */
function hit(zoneName: string): void {
  const z = zone(zoneName)
  const primary = logic.pool.primary()
  if (!primary) throw new Error('no live ball')
  primary.body.setTranslation({ x: 0, y: 1.3, z: 30 }, true)
  primary.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
  world.step()
  logic.step(DT)
  primary.body.setTranslation({ x: z.x, y: yFor[z.level], z: z.z }, true)
  primary.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
  world.step()
  logic.step(DT)
}

function runSeconds(seconds: number): void {
  const n = Math.round(seconds / DT)
  for (let i = 0; i < n; i++) {
    world.step()
    logic.step(DT)
  }
}

/** Send every live ball to the drain in one shot; a single pass of the
 * physics/logic loop is enough for checkDrains to collapse multiball down
 * to one ball (or trigger the ball-end sequence if it was already down
 * to one), since it iterates a snapshot of all currently-drained balls. */
function drainAll(): void {
  for (const b of [...logic.pool.balls]) {
    b.body.setTranslation({ x: 0, y: 1.3, z: 42 }, true)
    b.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
  }
  world.step()
  logic.step(DT)
}

// ------------------------------------------------------------ start game
logic.startNewGame()
// give this proof plenty of balls so mode-testing never hits a premature
// game-over; the final section deliberately dials this back down to force one.
useGameStore.setState({ totalBalls: 50 })
report('game starts in play', useGameStore.getState().screen === 'play', `screen=${useGameStore.getState().screen}`)

// ------------------------------------------------------------ TABLE -> Recruit
for (let i = 0; i < 5; i++) hit(`table${i}`)
report('TABLE complete lights Recruit', useGameStore.getState().recruitLit, `letters=${useGameStore.getState().tableLetters}`)

hit('rightOrbit')
report(
  'Recruit Multiball starts (3 balls)',
  useGameStore.getState().recruitActive && logic.pool.liveCount === 3,
  `active=${useGameStore.getState().recruitActive} liveCount=${logic.pool.liveCount}`,
)

runSeconds(46) // outlast the 45s timer
report(
  'Recruit Multiball ends on timer',
  !useGameStore.getState().recruitActive,
  `active=${useGameStore.getState().recruitActive} score=${useGameStore.getState().score}`,
)
drainAll()
report('back to single ball after Recruit', logic.pool.liveCount === 1, `liveCount=${logic.pool.liveCount}`)

// ------------------------------------------------------------ BUDGET -> Charter
for (let i = 0; i < 6; i++) hit(`budget${i}`)
report('BUDGET complete', useGameStore.getState().fundingLit, `letters=${useGameStore.getState().budgetLetters}`)

for (let i = 0; i < 3; i++) hit('filingCabinetLock')
report(
  'Charter Multiball starts on 3rd lock (3 balls)',
  useGameStore.getState().charterActive && logic.pool.liveCount === 3,
  `active=${useGameStore.getState().charterActive} liveCount=${logic.pool.liveCount} locks=${useGameStore.getState().charterLocks}`,
)

drainAll()
report(
  'Charter Multiball ends when down to 1 ball',
  !useGameStore.getState().charterActive && logic.pool.liveCount === 1,
  `active=${useGameStore.getState().charterActive} liveCount=${logic.pool.liveCount} score=${useGameStore.getState().score}`,
)

// ------------------------------------------------------------ Gavel -> Summary Judgment
hit('gavelTarget')
report('gavel hit registers', useGameStore.getState().gavelHit, `gavelHit=${useGameStore.getState().gavelHit}`)
hit('gavelTarget') // second hit: lock + start
report(
  'Summary Judgment wizard starts',
  useGameStore.getState().wizardActive && logic.pool.liveCount >= 4,
  `active=${useGameStore.getState().wizardActive} liveCount=${logic.pool.liveCount}`,
)

const scoreBeforeWizardDrain = useGameStore.getState().score
hit('precedentSpinner') // score something during the wizard so the award has a nonzero base
drainAll()
report(
  'Summary Judgment ends, awards on levels visited',
  !useGameStore.getState().wizardActive && useGameStore.getState().score > scoreBeforeWizardDrain,
  `active=${useGameStore.getState().wizardActive} score=${useGameStore.getState().score} (was ${scoreBeforeWizardDrain})`,
)

// ------------------------------------------------------------ Tilt
resetTilt()
registerNudge(0)
registerNudge(0.1)
const tiltedNow = registerNudge(0.2)
report('3 nudges in the window tilt', tiltedNow && useGameStore.getState().tilted, `tilted=${useGameStore.getState().tilted}`)
resetTilt()

// ------------------------------------------------------------ drain to game over
useGameStore.setState({ totalBalls: useGameStore.getState().ballNumber })
while (useGameStore.getState().screen === 'play') drainAll()
report(
  'game reaches gameOver after all balls drain',
  useGameStore.getState().screen === 'gameOver',
  `screen=${useGameStore.getState().screen} ballNumber=${useGameStore.getState().ballNumber}/${useGameStore.getState().totalBalls} finalScore=${useGameStore.getState().score}`,
)

console.log('\n--- score log (last 20) ---')
for (const line of useGameStore.getState().log.slice(-20)) console.log(' ', line)

console.log(failures === 0 ? '\nGate 4 game logic: ALL PASS' : `\nGate 4 game logic: ${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
