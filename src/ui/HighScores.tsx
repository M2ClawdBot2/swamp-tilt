import { useState, useEffect, type ReactElement } from 'react'
import { useGameStore } from '../game/state'
import { loadHighScores } from '../game/highScores'
import { play } from '../audio/bank'

export function HighScores(): ReactElement {
  const [scores, setScores] = useState(loadHighScores())
  useEffect(() => setScores(loadHighScores()), [])

  const back = () => {
    play('uiSelect')
    useGameStore.setState({ screen: 'menu' })
  }

  return (
    <div className="st-overlay">
      <div className="st-panel" style={{ width: 380 }}>
        <h1 className="st-title" style={{ fontSize: '1.6rem' }}>
          High Scores
        </h1>
        {scores.length === 0 ? (
          <p className="st-subtitle">No scores yet — be the first.</p>
        ) : (
          <ul className="st-list">
            {scores.map((s, i) => (
              <li key={i}>
                <span>
                  {i + 1}. {s.name}
                </span>
                <span className="st-dmd">{s.score.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
        <button className="st-btn" style={{ marginTop: '1rem' }} onClick={back} autoFocus>
          Back
        </button>
      </div>
    </div>
  )
}
