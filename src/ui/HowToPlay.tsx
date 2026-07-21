import type { ReactElement } from 'react'
import { useGameStore } from '../game/state'
import { play } from '../audio/bank'

export function HowToPlay(): ReactElement {
  const back = () => {
    play('uiSelect')
    useGameStore.setState({ screen: 'menu' })
  }
  return (
    <div className="st-overlay">
      <div className="st-panel" style={{ width: 460 }}>
        <h1 className="st-title" style={{ fontSize: '1.6rem' }}>
          How to Play
        </h1>
        <ul className="st-list" style={{ lineHeight: 1.6 }}>
          <li style={{ display: 'block' }}>Left / right thirds of the screen (or Shift keys) flip.</li>
          <li style={{ display: 'block' }}>Pull back and release the plunger to launch — hold for power.</li>
          <li style={{ display: 'block' }}>Complete T-A-B-L-E to light Recruit Multiball.</li>
          <li style={{ display: 'block' }}>Complete B-U-D-G-E-T on The Reitz to fund Charter Multiball.</li>
          <li style={{ display: 'block' }}>Lock the ball under the gavel on The Bench for Summary Judgment.</li>
          <li style={{ display: 'block' }}>Going up is hard. Falling down is cheap — progress is never lost.</li>
          <li style={{ display: 'block' }}>Nudge gently. Three hard nudges tilts the machine.</li>
        </ul>
        <button className="st-btn" style={{ marginTop: '1rem' }} onClick={back} autoFocus>
          Back
        </button>
      </div>
    </div>
  )
}
