import type { ReactElement } from 'react'
import { useGameStore, type Screen } from '../game/state'
import { useBridge } from './bridge'
import { play } from '../audio/bank'

export function MainMenu(): ReactElement {
  const bridge = useBridge()

  const goTo = (screen: Screen) => {
    play('uiSelect')
    useGameStore.setState({ screen })
  }

  return (
    <div className="st-overlay">
      <div className="st-panel" style={{ width: 380 }}>
        <h1 className="st-title">Swamp Tilt</h1>
        <p className="st-subtitle">Turlington Plaza · The Reitz · The Bench</p>
        <button
          className="st-btn"
          autoFocus
          onClick={() => {
            play('uiConfirm')
            bridge.startGame()
          }}
        >
          Play
        </button>
        <button className="st-btn" onClick={() => goTo('options')}>
          Options
        </button>
        <button className="st-btn" onClick={() => goTo('highScores')}>
          High Scores
        </button>
        <button className="st-btn" onClick={() => goTo('howToPlay')}>
          How to Play
        </button>
        <button className="st-btn" onClick={() => goTo('credits')}>
          Credits
        </button>
      </div>
    </div>
  )
}
