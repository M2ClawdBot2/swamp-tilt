import type { ReactElement } from 'react'
import { useGame } from './hooks'
import { MainMenu } from './MainMenu'
import { Options } from './Options'
import { HighScores } from './HighScores'
import { HowToPlay } from './HowToPlay'
import { Credits } from './Credits'
import { HUD } from './HUD'
import { Pause } from './Pause'
import { GameOver } from './GameOver'
import { Attract } from './Attract'
import { TouchControls } from './TouchControls'

const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window

export function App({ onLaunch }: { onLaunch: (power: number) => void }): ReactElement | null {
  const screen = useGame((s) => s.screen)

  switch (screen) {
    case 'attract':
      return <Attract />
    case 'menu':
      return <MainMenu />
    case 'options':
      return <Options />
    case 'highScores':
      return <HighScores />
    case 'howToPlay':
      return <HowToPlay />
    case 'credits':
      return <Credits />
    case 'paused':
      return <Pause />
    case 'gameOver':
      return <GameOver />
    case 'play':
    case 'ballEnd':
      return (
        <>
          <HUD />
          {isTouch && <TouchControls onLaunch={onLaunch} />}
        </>
      )
    default:
      return null
  }
}
