import * as THREE from 'three'

/**
 * Gate 1: fixed camera, ~35° down, whole playfield in frame.
 * Ball-follow with damping/deadzone arrives with the multilevel work (§6).
 */
export function createCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1, 600)
  cam.position.set(0, 78, 106)
  cam.lookAt(0, 0, -4)
  return cam
}

export function handleResize(cam: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
  window.addEventListener('resize', () => {
    cam.aspect = window.innerWidth / window.innerHeight
    cam.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })
}
