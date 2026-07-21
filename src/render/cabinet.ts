import * as THREE from 'three'

/**
 * Gate 1 slice of the cabinet (§8): side rails with the two flipper buttons
 * physically visible and depressing on press. The full cabinet (lockdown bar,
 * plunger, backglass) is Gate 5, but the buttons ship now — they're the
 * feedback loop for tuning flipper feel.
 */
export interface CabinetButtons {
  update(leftPressed: boolean, rightPressed: boolean, dt: number): void
  /** "Show cabinet" option: hides the rails only — the buttons stay visible,
   * per §8, since on mobile they double as the touch targets. */
  setRailsVisible(visible: boolean): void
}

const TRAVEL = 1.1 // cm of button travel when pressed

export function buildCabinet(scene: THREE.Scene): CabinetButtons {
  const rails = new THREE.Group()
  scene.add(rails)
  const railMat = new THREE.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.4, metalness: 0.6 })
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 100), railMat)
    rail.position.set(sx * 29.8, 1.4, -4)
    rail.receiveShadow = true
    rails.add(rail)
  }

  const btnMat = new THREE.MeshStandardMaterial({ color: 0xd93025, roughness: 0.35 })
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 0.5 })

  function makeButton(sx: number): THREE.Mesh {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.2, 24), collarMat)
    collar.rotation.z = Math.PI / 2
    collar.position.set(sx * 32.0, 2.6, 30)
    scene.add(collar)

    const btn = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.4, 24), btnMat)
    btn.rotation.z = Math.PI / 2
    btn.position.set(sx * 33.2, 2.6, 30)
    btn.castShadow = true
    scene.add(btn)
    return btn
  }

  const leftBtn = makeButton(-1)
  const rightBtn = makeButton(1)
  const leftRest = leftBtn.position.x
  const rightRest = rightBtn.position.x

  return {
    update(leftPressed: boolean, rightPressed: boolean, dt: number): void {
      // snappy press, slightly softer return — reads as a real leaf switch
      const approach = (cur: number, target: number, rate: number) =>
        cur + (target - cur) * Math.min(1, rate * dt)
      leftBtn.position.x = approach(
        leftBtn.position.x,
        leftRest + (leftPressed ? TRAVEL : 0),
        leftPressed ? 60 : 25,
      )
      rightBtn.position.x = approach(
        rightBtn.position.x,
        rightRest - (rightPressed ? TRAVEL : 0),
        rightPressed ? 60 : 25,
      )
    },
    setRailsVisible(visible: boolean): void {
      rails.visible = visible
    },
  }
}
