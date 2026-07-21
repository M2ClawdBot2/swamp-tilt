import * as THREE from 'three'
import type { WallDesc } from '../game/physics/colliders'
import { BALL_RADIUS } from '../game/scale'
import { FLIPPER, type FlipperSide } from '../game/physics/flippers'

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)
  return renderer
}

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0f0c)

  const hemi = new THREE.HemisphereLight(0xcfe8d8, 0x1a221c, 0.9)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(-40, 90, 20)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -60
  key.shadow.camera.right = 60
  key.shadow.camera.top = 60
  key.shadow.camera.bottom = -60
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x88aaff, 0.5)
  fill.position.set(50, 40, 60)
  scene.add(fill)

  return scene
}

/** Debug meshes for the authored colliders. Hidden in prod, per §4. */
export function buildTableMeshes(scene: THREE.Scene, descs: WallDesc[]): void {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x99a396, roughness: 0.6 })
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x14361f, roughness: 0.9 })
  for (const d of descs) {
    if (d.kind === 'glass') continue
    const geo = new THREE.BoxGeometry(d.hx * 2, d.hy * 2, d.hz * 2)
    const mesh = new THREE.Mesh(geo, d.kind === 'floor' ? floorMat : wallMat)
    mesh.position.set(d.cx, d.cy, d.cz)
    mesh.rotation.y = d.yaw
    mesh.receiveShadow = true
    mesh.castShadow = d.kind === 'wall'
    scene.add(mesh)
  }
}

export function buildBallMesh(scene: THREE.Scene): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 0.95, roughness: 0.22 }),
  )
  mesh.castShadow = true
  scene.add(mesh)
  return mesh
}

/** Pivot group whose rotation.y mirrors the physics flipper angle. */
export function buildFlipperMesh(
  scene: THREE.Scene,
  side: FlipperSide,
  pivotX: number,
  pivotY: number,
  pivotZ: number,
): THREE.Group {
  const group = new THREE.Group()
  group.position.set(pivotX, pivotY, pivotZ)
  const bat = new THREE.Mesh(
    new THREE.CapsuleGeometry(FLIPPER.radius, FLIPPER.halfLen * 2, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xd93a2b, roughness: 0.45 }),
  )
  bat.rotation.z = Math.PI / 2
  bat.position.x = side === 'left' ? FLIPPER.halfLen : -FLIPPER.halfLen
  bat.castShadow = true
  group.add(bat)
  scene.add(group)
  return group
}
