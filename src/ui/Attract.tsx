import { useEffect, useState, type ReactElement } from 'react'
import { useGameStore } from '../game/state'
import { loadHighScores } from '../game/highScores'
import { play } from '../audio/bank'

const MODE_NAMES = ['Recruit Multiball', 'Charter Multiball', 'Summary Judgment']

export function Attract(): ReactElement {
  const [slide, setSlide] = useState(0)
  const scores = loadHighScores()
  const slides = [
    { kind: 'title' as const },
    { kind: 'scores' as const },
    { kind: 'modes' as const },
  ]

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4000)
    return () => clearInterval(id)
  }, [slides.length])

  const start = () => {
    play('uiConfirm')
    useGameStore.setState({ screen: 'menu' })
  }

  const current = slides[slide]

  return (
    <div className="st-overlay" onClick={start}>
      <div className="st-panel" style={{ width: 420, textAlign: 'center', cursor: 'pointer' }}>
        <h1 className="st-title">Swamp Tilt</h1>
        {current.kind === 'title' && (
          <p className="st-subtitle">Turlington Plaza · The Reitz · The Bench</p>
        )}
        {current.kind === 'scores' && (
          <>
            <p className="st-subtitle">High Scores</p>
            {scores.length === 0 ? (
              <p className="st-subtitle">No scores yet</p>
            ) : (
              <ul className="st-list">
                {scores.slice(0, 5).map((s, i) => (
                  <li key={i}>
                    <span>
                      {i + 1}. {s.name}
                    </span>
                    <span className="st-dmd">{s.score.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {current.kind === 'modes' && (
          <>
            <p className="st-subtitle">Modes</p>
            <ul className="st-list">
              {MODE_NAMES.map((m) => (
                <li key={m} style={{ justifyContent: 'center' }}>
                  {m}
                </li>
              ))}
            </ul>
          </>
        )}
        <button className="st-btn" style={{ marginTop: '1rem' }} onClick={start} autoFocus>
          Press to start
        </button>
      </div>
    </div>
  )
}
