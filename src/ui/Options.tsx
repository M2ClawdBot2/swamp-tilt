import type { ReactElement } from 'react'
import { useSettings } from './hooks'
import { settingsStore } from '../game/settings'
import { useGameStore } from '../game/state'
import { setVolume, setMuted, play } from '../audio/bank'

export function Options(): ReactElement {
  const s = useSettings((st) => st)

  const back = () => {
    play('uiSelect')
    useGameStore.setState({ screen: 'menu' })
  }

  return (
    <div className="st-overlay">
      <div className="st-panel" style={{ width: 420 }}>
        <h1 className="st-title" style={{ fontSize: '1.6rem' }}>
          Options
        </h1>
        <div className="st-row">
          <label htmlFor="opt-volume">Audio volume</label>
          <input
            id="opt-volume"
            className="st-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.audioVolume}
            onChange={(e) => {
              const v = Number(e.target.value)
              settingsStore.getState().set('audioVolume', v)
              setVolume(v)
            }}
          />
        </div>
        <div className="st-row">
          <label htmlFor="opt-mute">Mute</label>
          <input
            id="opt-mute"
            type="checkbox"
            checked={s.audioMuted}
            onChange={(e) => {
              settingsStore.getState().set('audioMuted', e.target.checked)
              setMuted(e.target.checked)
            }}
          />
        </div>
        <div className="st-row">
          <label htmlFor="opt-shake">Camera shake</label>
          <input
            id="opt-shake"
            type="checkbox"
            checked={s.cameraShake}
            onChange={(e) => settingsStore.getState().set('cameraShake', e.target.checked)}
          />
        </div>
        <div className="st-row">
          <label htmlFor="opt-follow">Follow strength</label>
          <input
            id="opt-follow"
            className="st-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.followStrength}
            onChange={(e) => settingsStore.getState().set('followStrength', Number(e.target.value))}
          />
        </div>
        <div className="st-row">
          <label htmlFor="opt-reduced">Reduced motion</label>
          <input
            id="opt-reduced"
            type="checkbox"
            checked={s.reducedMotion}
            onChange={(e) => settingsStore.getState().set('reducedMotion', e.target.checked)}
          />
        </div>
        <div className="st-row">
          <label htmlFor="opt-difficulty">Difficulty</label>
          <select
            id="opt-difficulty"
            value={s.difficulty}
            onChange={(e) => settingsStore.getState().set('difficulty', e.target.value as typeof s.difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="standard">Standard</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="st-row">
          <label htmlFor="opt-cabinet">Show cabinet</label>
          <input
            id="opt-cabinet"
            type="checkbox"
            checked={s.showCabinet}
            onChange={(e) => settingsStore.getState().set('showCabinet', e.target.checked)}
          />
        </div>
        <button className="st-btn" style={{ marginTop: '1rem' }} onClick={back} autoFocus>
          Back
        </button>
      </div>
    </div>
  )
}
