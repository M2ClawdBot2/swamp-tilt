import * as THREE from 'three'
import { PLAZA } from '../game/levels'

/**
 * The cabinet furniture (§8): side rails with the two flipper buttons that
 * depress on press, plus the plunger rod at the bottom of the shooter lane
 * that pulls back as it charges. Right side is shifted outward from the left
 * because the shooter lane widened the machine on the right.
 */
export interface CabinetButtons {
  update(leftPressed: boolean, rightPressed: boolean, plungerCharge: number, dt: number): void
  /** "Show cabinet" option: hides the rails only — the buttons stay visible,
   * per §8, since on mobile they double as the touch targets. */
  setRailsVisible(visible: boolean): void
}

const TRAVEL = 1.1 // cm of button travel when pressed
const PLUNGER_PULL = 6 // cm the plunger rod travels at full charge

export function buildCabinet(scene: THREE.Scene): CabinetButtons {
  const rails = new THREE.Group()
  scene.add(rails)
  const railMat = new THREE.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.4, metalness: 0.6 })
  // Left rail tight; right rail shifted out past the shooter lane (x=32).
  const railX = { left: -29.8, right: 35.5 }
  for (const [side, x] of Object.entries(railX)) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 100), railMat)
    rail.position.set(x, 1.4, -4)
    rail.receiveShadow = true
    rails.add(rail)
    void side
  }

  const btnMat = new THREE.MeshStandardMaterial({ color: 0xd93025, roughness: 0.35 })
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 0.5 })

  function makeButton(collarX: number, btnX: number): THREE.Mesh {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.2, 24), collarMat)
    collar.rotation.z = Math.PI / 2
    collar.position.set(collarX, 2.6, 30)
    scene.add(collar)

    const btn = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.4, 24), btnMat)
    btn.rotation.z = Math.PI / 2
    btn.position.set(btnX, 2.6, 30)
    btn.castShadow = true
    scene.add(btn)
    return btn
  }

  const leftBtn = makeButton(-32.0, -33.2)
  const rightBtn = makeButton(37.5, 38.7)
  const leftRest = leftBtn.position.x
  const rightRest = rightBtn.position.x

  // ---- Plunger rod at the bottom of the shooter lane ----
  const S = PLAZA.shooter
  const plunger = new THREE.Group()
  plunger.position.set(S.serveX, 2, S.bottomZ + 2) // just behind the served ball
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xb8b8be, roughness: 0.25, metalness: 0.85 })
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.5 })
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 12, 16), shaftMat)
  shaft.rotation.x = Math.PI / 2
  shaft.position.z = 6
  shaft.castShadow = true
  plunger.add(shaft)
  const knob = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), knobMat)
  knob.position.z = 12.5
  knob.castShadow = true
  plunger.add(knob)
  scene.add(plunger)
  const plungerRestZ = plunger.position.z

  return {
    update(leftPressed: boolean, rightPressed: boolean, plungerCharge: number, dt: number): void {
      // snappy press, slightly softer return — reads as a real leaf switch
      const approach = (cur: number, target: number, rate: number) =>
        cur + (target - cur) * Math.min(1, rate * dt)
      leftBtn.position.x = approach(leftBtn.position.x, leftRest + (leftPressed ? TRAVEL : 0), leftPressed ? 60 : 25)
      rightBtn.position.x = approach(rightBtn.position.x, rightRest - (rightPressed ? TRAVEL : 0), rightPressed ? 60 : 25)
      // plunger pulls back proportional to charge, snaps forward on release
      const targetZ = plungerRestZ + plungerCharge * PLUNGER_PULL
      plunger.position.z = approach(plunger.position.z, targetZ, plungerCharge > 0.01 ? 30 : 80)
    },
    setRailsVisible(visible: boolean): void {
      rails.visible = visible
    },
  }
}
