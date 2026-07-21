/**
 * Gate 7 proof, headless: the plunger + shooter lane. Same modules the
 * browser runs, 240 Hz. `npm run test:gate7`.
 *
 * Proves the "feel real" ball-start ritual actually works mechanically:
 * a served ball waits in the lane (does NOT drain), a full-power plunge
 * carries it up the lane and into the playfield, a minimum plunge still
 * clears the lane (no dead ball), and the whole thing composes with the
 * game loop so a game still reaches game over.
 */
import { initRapier, createWorld } from '../src/game/physics/world'
import { buildAllLevels, PLAZA, levelOfY } from '../src/game/levels'
import { Flipper } from '../src/game/physics/flippers'
import { GameLogic } from '../src/game/gameLogic'
import { BallPool } from '../src/game/multiball'
import { useGameStore } from '../src/game/state'
import { serveToLane, releasePlunger, PLUNGER } from '../src/game/plunger'
import { createBall } from '../src/game/physics/ball'
import { DT, BALL_RADIUS } from '../src/game/scale'

await initRapier()

let failures = 0
function report(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`)
  if (!ok) failures++
}

function freshWorld() {
  const world = createWorld()
  buildAllLevels(world)
  // flippers must exist and rest — the lane/launch must work with the full machine
  new Flipper(world, 'left', -PLAZA.flipperPivotX, PLAZA.flipperPivotZ)
  new Flipper(world, 'right', PLAZA.flipperPivotX, PLAZA.flipperPivotZ)
  return world
}

// ---------------------------------------------- 1. served ball waits, no drain
{
  const world = freshWorld()
  const ball = createBall(world, 0, BALL_RADIUS, 20)
  serveToLane(ball)
  // step 1.5s with NO launch — ball must settle in the lane and stay there,
  // and (critically) not be flagged out of the lane
  for (let i = 0; i < Math.round(1.5 / DT); i++) world.step()
  const p = ball.translation()
  const inLane = p.x > 26.5 && p.z > 35 && p.y < 5
  report(
    'served ball waits in the shooter lane',
    inLane && useGameStore.getState().ballInLane,
    `rested at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}), ballInLane=${useGameStore.getState().ballInLane}`,
  )
}

// ---------------------------------------------- 2. full plunge reaches the field
{
  const world = freshWorld()
  const ball = createBall(world, 0, BALL_RADIUS, 20)
  serveToLane(ball)
  for (let i = 0; i < Math.round(0.4 / DT); i++) world.step() // settle
  const speed = releasePlunger(ball, 1.0) // full power
  let reachedPlay = false
  let minX = 99
  for (let i = 0; i < Math.round(3 / DT); i++) {
    world.step()
    const p = ball.translation()
    if (levelOfY(p.y) === 1 && p.x < 24 && p.z < 40) reachedPlay = true // left the lane, into the field
    minX = Math.min(minX, p.x)
  }
  report(
    'full plunge carries the ball into the playfield',
    reachedPlay,
    `launch ${speed?.toFixed(0)} cm/s, reached x as low as ${minX.toFixed(1)} (needs < 24 to be in the field)`,
  )
}

// ---------------------------------------------- 3. minimum plunge still clears
{
  const world = freshWorld()
  const ball = createBall(world, 0, BALL_RADIUS, 20)
  serveToLane(ball)
  for (let i = 0; i < Math.round(0.4 / DT); i++) world.step()
  releasePlunger(ball, 0) // minimum power
  let leftLane = false
  for (let i = 0; i < Math.round(4 / DT); i++) {
    world.step()
    const p = ball.translation()
    if (p.z < 30) leftLane = true // climbed clear up the lane at least
  }
  const p = ball.translation()
  report(
    'minimum plunge still clears the lane (no dead ball)',
    leftLane,
    `min launch ${PLUNGER.minLaunch} cm/s, climbed to z as low as reached; ended (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`,
  )
}

// ---------------------------------------------- 4. composes with a full game
{
  const world = freshWorld()
  const logic = new GameLogic(new BallPool(world))
  logic.startNewGame()
  report(
    'new game serves the first ball into the lane',
    useGameStore.getState().ballInLane && logic.pool.liveCount === 1,
    `ballInLane=${useGameStore.getState().ballInLane} liveCount=${logic.pool.liveCount}`,
  )

  // plunge, then let it play out; drain the ball repeatedly to reach game over
  logic.launch(1.0)
  useGameStore.setState({ totalBalls: 3 })
  let guard = 0
  while (useGameStore.getState().screen === 'play' && guard < 2_000_000) {
    world.step()
    logic.step(DT)
    guard++
    // if a ball is waiting in the lane, plunge it so the game progresses
    if (useGameStore.getState().ballInLane) logic.launch(1.0)
    // force-drain whatever is in play to march toward game over
    for (const b of logic.pool.balls) {
      const p = b.body.translation()
      if (!useGameStore.getState().ballInLane && p.z < 41) b.body.setTranslation({ x: 0, y: 1.3, z: 42 }, true)
    }
  }
  report(
    'plunger composes with the game loop to reach game over',
    useGameStore.getState().screen === 'gameOver',
    `screen=${useGameStore.getState().screen} ballNumber=${useGameStore.getState().ballNumber}/${useGameStore.getState().totalBalls}`,
  )
}

console.log(failures === 0 ? '\nGate 7 plunger: ALL PASS' : `\nGate 7 plunger: ${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
