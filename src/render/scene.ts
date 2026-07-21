import * as THREE from 'three'
import { type WallDesc, quatFor } from '../game/physics/colliders'
import { BALL_RADIUS } from '../game/scale'
import { type Flipper } from '../game/physics/flippers'

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
  key.position.set(-40, 160, 20)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -70
  key.shadow.camera.right = 70
  key.shadow.camera.top = 70
  key.shadow.camera.bottom = -110
  key.shadow.camera.far = 400
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x88aaff, 0.5)
  fill.position.set(50, 90, 60)
  scene.add(fill)

  return scene
}

// Placeholder palette until the Phase 4 token file: plaza green, Reitz
// institutional blue-grey, Bench brass.
const FLOOR_COLORS: Record<1 | 2 | 3, number> = { 1: 0x14361f, 2: 0x2e3a46, 3: 0x4a3c1c }
const WALL_COLORS: Record<1 | 2 | 3, number> = { 1: 0x99a396, 2: 0x77808c, 3: 0x9a8756 }

/** Debug meshes for the authored colliders. Hidden in prod, per §4. */
export function buildTableMeshes(scene: THREE.Scene, descs: WallDesc[]): void {
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0xb9c4c0,
    roughness: 0.3,
    metalness: 0.5,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  })
  for (const d of descs) {
    if (d.kind === 'glass') continue
    const geo = new THREE.BoxGeometry(d.hx * 2, d.hy * 2, d.hz * 2)
    let mat: THREE.Material
    if (d.kind === 'ramp' || d.kind === 'rampWall') {
      mat = rampMat
    } else if (d.kind === 'floor') {
      mat = new THREE.MeshStandardMaterial({ color: FLOOR_COLORS[d.level], roughness: 0.9 })
    } else {
      mat = new THREE.MeshStandardMaterial({ color: WALL_COLORS[d.level], roughness: 0.6 })
    }
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(d.cx, d.cy, d.cz)
    const q = quatFor(d)
    mesh.quaternion.set(q.x, q.y, q.z, q.w)
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
export function buildFlipperMesh(scene: THREE.Scene, f: Flipper): THREE.Group {
  const group = new THREE.Group()
  group.position.set(f.pivotX, f.pivotY, f.pivotZ)
  const bat = new THREE.Mesh(
    new THREE.CapsuleGeometry(f.radius, f.halfLen * 2, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xd93a2b, roughness: 0.45 }),
  )
  bat.rotation.z = Math.PI / 2
  bat.position.x = f.side === 'left' ? f.halfLen : -f.halfLen
  bat.castShadow = true
  group.add(bat)
  scene.add(group)
  return group
}
