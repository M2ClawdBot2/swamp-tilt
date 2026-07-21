import { useState, type ReactElement } from 'react'
import { useGame } from './hooks'
import { useGameStore } from '../game/state'
import { qualifiesForHighScore, addHighScore } from '../game/highScores'
import { play } from '../audio/bank'

export function GameOver(): ReactElement {
  const score = useGame((s) => s.score)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const qualifies = qualifiesForHighScore(score) && !saved

  const save = () => {
    play('uiConfirm')
    addHighScore({ name: name.trim() || 'GTR', score, date: new Date().toISOString().slice(0, 10) })
    setSaved(true)
  }

  const toMenu = () => {
    play('uiSelect')
    useGameStore.setState({ screen: 'menu' })
  }

  return (
    <div className="st-overlay">
      <div className="st-panel" style={{ width: 380, textAlign: 'center' }}>
        <h1 className="st-title" style={{ fontSize: '1.6rem' }}>
          Game Over
        </h1>
        <p className="st-dmd" style={{ fontSize: '1.8rem', margin: '0.5rem 0' }}>
          {score.toLocaleString()}
        </p>
        {qualifies ? (
          <>
            <p className="st-subtitle">New high score — enter initials</p>
            <input
              value={name}
              maxLength={3}
              autoFocus
              onChange={(e) => setName(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                textAlign: 'center',
                fontSize: '1.4rem',
                letterSpacing: '0.3em',
                background: 'transparent',
                color: 'var(--st-dmd-amber)',
                border: '1px solid var(--st-institutional-blue-grey)',
                borderRadius: 4,
                padding: '0.4rem',
                marginBottom: '0.8rem',
              }}
            />
            <button className="st-btn" onClick={save}>
              Save
            </button>
          </>
        ) : (
          <button className="st-btn" style={{ marginTop: '1rem' }} onClick={toMenu} autoFocus>
            Continue
          </button>
        )}
        {saved && (
          <button className="st-btn" onClick={toMenu}>
            Continue
          </button>
        )}
      </div>
    </div>
  )
}
