/**
 * The seam between React (menus/HUD) and the physics-owned GameLogic in
 * main.ts. React never touches the ball or flipper state directly (per the
 * build prompt) — it only calls these action functions, which main.ts wires
 * up once GameLogic exists. Menus can render before that wiring is ready
 * (attract mode boots first), so every call is a safe no-op until then.
 */
export interface UiBridge {
  startGame(): void
  resumeGame(): void
  pauseGame(): void
  quitToMenu(): void
}

let bridge: UiBridge = {
  startGame() {},
  resumeGame() {},
  pauseGame() {},
  quitToMenu() {},
}

export function installBridge(impl: UiBridge): void {
  bridge = impl
}

export function useBridge(): UiBridge {
  return bridge
}
