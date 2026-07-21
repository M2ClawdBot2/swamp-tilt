import * as THREE from 'three'
import { levelOfY } from '../game/levels'

/**
 * Per-level framing with a 400 ms eased dolly on level change (§6). Gentle
 * ball-follow inside a level: deadzone + heavy damping, never hard-locked.
 */
interface Framing {
  pos: THREE.Vector3
  look: THREE.Vector3
}

const FRAMINGS: Record<1 | 2 | 3, Framing> = {
  1: { pos: new THREE.Vector3(0, 78, 106), look: new THREE.Vector3(0, 0, -4) },
  2: { pos: new THREE.Vector3(0, 118, 64), look: new THREE.Vector3(0, 40, -16) },
  3: { pos: new THREE.Vector3(0, 150, 26), look: new THREE.Vector3(0, 80, -26) },
}

const DOLLY_TIME = 0.4
const FOLLOW_DEADZONE = 6 // cm of ball x before the camera cares
const FOLLOW_GAIN = 0.22
const FOLLOW_DAMP = 3.5 // 1/s

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera
  level: 1 | 2 | 3 = 1
  private from: Framing = FRAMINGS[1]
  private to: Framing = FRAMINGS[1]
  private dollyT = 1
  private followX = 0
  /** set false (reduced motion) to make dollies instant */
  animateDolly = true
  /** Options → follow strength slider, 0-1; multiplies the base follow gain. */
  followGainMultiplier = 1

  constructor() {
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1, 600)
    this.camera.position.copy(FRAMINGS[1].pos)
    this.camera.lookAt(FRAMINGS[1].look)
  }

  update(ballPos: { x: number; y: number; z: number }, dt: number): void {
    const lvl = levelOfY(ballPos.y)
    if (lvl !== this.level) {
      this.from = {
        pos: this.camera.position.clone(),
        look: this.to.look.clone(),
      }
      this.to = FRAMINGS[lvl]
      this.dollyT = this.animateDolly ? 0 : 1
      this.level = lvl
    }
    if (this.dollyT < 1) this.dollyT = Math.min(1, this.dollyT + dt / DOLLY_TIME)
    const s = smoothstep(this.dollyT)

    // ball-follow: only past the deadzone, heavily damped
    const excess = Math.abs(ballPos.x) > FOLLOW_DEADZONE ? ballPos.x : 0
    const targetFollow = excess * FOLLOW_GAIN * this.followGainMultiplier
    this.followX += (targetFollow - this.followX) * Math.min(1, FOLLOW_DAMP * dt)

    const pos = this.from.pos.clone().lerp(this.to.pos, s)
    const look = this.from.look.clone().lerp(this.to.look, s)
    pos.x += this.followX
    look.x += this.followX * 1.4
    this.camera.position.copy(pos)
    this.camera.lookAt(look)
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
  }
}
