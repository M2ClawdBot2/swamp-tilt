/**
 * Mobile input: left/right thirds of the screen flip (no floating buttons —
 * per §8, the control surface and the art are the same object; the cabinet
 * rails ARE the touch targets). Middle third is reserved for a pull-back
 * plunger gesture. This overlay is invisible — it exists purely to route
 * touch events to the same `input` flags the keyboard uses, so it must sit
 * ABOVE the canvas but never block seeing it.
 */
import { useRef, type ReactElement } from 'react'
import { input } from '../game/input'

const PLUNGE_MAX_PULL = 120 // px of drag before "full power"

export function TouchControls({ onLaunch }: { onLaunch: (power?: number) => void }): ReactElement {
  const pullStart = useRef<number | null>(null)

  return (
    <div className="st-overlay" style={{ background: 'transparent' }}>
      <div
        className="st-touch-zone"
        style={{ left: 0 }}
        onPointerDown={(e) => {
          e.preventDefault()
          input.left = true
        }}
        onPointerUp={() => (input.left = false)}
        onPointerCancel={() => (input.left = false)}
        onPointerLeave={() => (input.left = false)}
      />
      <div
        className="st-touch-zone"
        style={{ left: '33.34%' }}
        onPointerDown={(e) => {
          e.preventDefault()
          pullStart.current = e.clientY
        }}
        onPointerUp={(e) => {
          if (pullStart.current == null) return
          const pull = Math.max(0, pullStart.current - e.clientY)
          const power = Math.min(1, pull / PLUNGE_MAX_PULL)
          onLaunch(Math.max(0.35, power)) // even a tap launches at a floor power
          pullStart.current = null
        }}
        onPointerCancel={() => (pullStart.current = null)}
      />
      <div
        className="st-touch-zone"
        style={{ right: 0 }}
        onPointerDown={(e) => {
          e.preventDefault()
          input.right = true
        }}
        onPointerUp={() => (input.right = false)}
        onPointerCancel={() => (input.right = false)}
        onPointerLeave={() => (input.right = false)}
      />
    </div>
  )
}
