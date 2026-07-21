import type { ReactElement } from 'react'
import { useBridge } from './bridge'
import { useGameStore } from '../game/state'
import { play } from '../audio/bank'

export function Pause(): ReactElement {
  const bridge = useBridge()
  return (
    <div className="st-overlay">
      <div className="st-panel" style={{ width: 320 }}>
        <h1 className="st-title" style={{ fontSize: '1.6rem' }}>
          Paused
        </h1>
        <button
          className="st-btn"
          autoFocus
          onClick={() => {
            play('uiConfirm')
            bridge.resumeGame()
          }}
        >
          Resume
        </button>
        <button
          className="st-btn"
          onClick={() => {
            play('uiSelect')
            useGameStore.setState({ screen: 'options' })
          }}
        >
          Options
        </button>
        <button
          className="st-btn"
          onClick={() => {
            play('uiSelect')
            bridge.quitToMenu()
          }}
        >
          Quit to menu
        </button>
      </div>
    </div>
  )
}
