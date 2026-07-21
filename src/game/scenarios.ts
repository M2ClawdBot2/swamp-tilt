/**
 * Scripted input scenarios shared by the node physics tests and the browser
 * demo mode (?demo=gate1). Same physics, same timings — what passes headless
 * is what the video shows.
 */
import type RAPIER from '@dimforge/rapier3d-compat'
import { BALL_RADIUS } from './scale'

export interface ScenarioCtx {
  ball: RAPIER.RigidBody
  setLeft(pressed: boolean): void
  setRight(pressed: boolean): void
}

export interface ScenarioEvent {
  /** seconds of physics time from scenario start */
  t: number
  run(ctx: ScenarioCtx): void
}

export interface Scenario {
  name: string
  label: string
  duration: number
  events: ScenarioEvent[]
}

function place(ball: RAPIER.RigidBody, x: number, y: number, z: number, vx = 0, vy = 0, vz = 0): void {
  ball.setTranslation({ x, y, z }, true)
  ball.setLinvel({ x: vx, y: vy, z: vz }, true)
  ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
}

/** Hold left flipper up, drop the ball onto it, ball settles in the cradle. */
export const cradleScenario: Scenario = {
  name: 'cradle',
  label: 'Catch + cradle (hold = stays up)',
  duration: 4.5,
  events: [
    { t: 0, run: (c) => c.setLeft(true) },
    { t: 0.25, run: (c) => place(c.ball, -8.0, 3.0, 31.5) },
  ],
}

/**
 * Post-pass: from a left cradle, drop the flipper so the ball rolls off,
 * then tap as it comes off the tip — ball hops across to the right flipper,
 * which is held to catch.
 */
export const postPassScenario: Scenario = {
  name: 'postpass',
  label: 'Post-pass (left cradle → tap → right catch)',
  duration: 8.0,
  // NOTE: events must be in ascending t — the player fires them in order.
  events: [
    { t: 0, run: (c) => c.setLeft(true) },
    { t: 0.25, run: (c) => place(c.ball, -8.0, 3.0, 31.5) },
    { t: 3.25, run: (c) => c.setLeft(false) }, // drop — ball rolls toward tip
    {
      t: 3.6, // tap as the ball reaches mid-bat; right comes up to catch
      run: (c) => {
        c.setLeft(true)
        c.setRight(true)
      },
    },
    { t: 3.68, run: (c) => c.setLeft(false) },
  ],
}

/** Full-power orbit: up the left lane, around the arch, down the right side. */
export const orbitScenario: Scenario = {
  name: 'orbit',
  label: 'Full-power orbit shot (left lane → arch → right lane)',
  duration: 5.0,
  events: [{ t: 0.25, run: (c) => place(c.ball, -22.6, BALL_RADIUS, 14, -10, 0, -550) }],
}

/** Independence: stagger press/release, both held simultaneously mid-way. */
export const bothHeldScenario: Scenario = {
  name: 'bothheld',
  label: 'Both buttons held — independent flippers',
  duration: 3.0,
  events: [
    { t: 0.1, run: (c) => place(c.ball, 0, BALL_RADIUS, 20) },
    { t: 0.3, run: (c) => c.setLeft(true) },
    { t: 0.8, run: (c) => c.setRight(true) }, // both held now
    { t: 1.8, run: (c) => c.setLeft(false) }, // right must stay up
    { t: 2.5, run: (c) => c.setRight(false) },
  ],
}

/** Flipper strike: ball fed down the left inlane, flip on arrival. */
export const strikeScenario: Scenario = {
  name: 'strike',
  label: 'Full-power flip off the left flipper',
  duration: 4.0,
  events: [
    { t: 0.1, run: (c) => place(c.ball, -16.5, BALL_RADIUS, 26, 18, 0, 30) },
    { t: 0.62, run: (c) => c.setLeft(true) },
    { t: 1.0, run: (c) => c.setLeft(false) },
  ],
}

export const gate1Scenarios: Scenario[] = [
  cradleScenario,
  postPassScenario,
  orbitScenario,
  strikeScenario,
  bothHeldScenario,
]
