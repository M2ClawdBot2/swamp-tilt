import type { ReactElement } from 'react'
import { useGameStore } from '../game/state'
import { play } from '../audio/bank'

export function Credits(): ReactElement {
  const back = () => {
    play('uiSelect')
    useGameStore.setState({ screen: 'menu' })
  }
  return (
    <div className="st-overlay">
      <div className="st-panel" style={{ width: 380 }}>
        <h1 className="st-title" style={{ fontSize: '1.6rem' }}>
          Credits
        </h1>
        <p className="st-subtitle" style={{ textAlign: 'left' }}>
          SWAMP TILT — a pinball machine for the University of Florida College
          Republicans. Built with Three.js and Rapier.
        </p>
        <button className="st-btn" style={{ marginTop: '1rem' }} onClick={back} autoFocus>
          Back
        </button>
      </div>
    </div>
  )
}
