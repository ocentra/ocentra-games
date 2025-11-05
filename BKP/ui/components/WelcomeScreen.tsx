import { useGameStore } from '@/store/gameStore'
import { useEffect } from 'react'

export function WelcomeScreen() {
  const { setCurrentScreen, initializeEngine } = useGameStore()

  const handleEnterGame = () => {
    initializeEngine()
    setCurrentScreen('main_menu')
  }

  const handleSkipToGame = () => {
    initializeEngine()
    // Skip straight to game with default settings (1 human vs 3 AI, medium difficulty)
    setCurrentScreen('game')
  }

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        setCurrentScreen('game_mode_select')
      } else if (event.key === ' ') {
        event.preventDefault()
        handleSkipToGame()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="intro-visual">
          <div className="card-stack">
            <div className="card card-1">♠</div>
            <div className="card card-2">♥</div>
            <div className="card card-3">♦</div>
            <div className="card card-4">♣</div>
          </div>
        </div>

        <div className="game-logo">
          <h1>CLAIM</h1>
          <div className="logo-subtitle">Card Game</div>
        </div>
        
        <div className="game-description">
          <h3>High-Stakes Psychological Card Game</h3>
          <p>
            CLAIM is a strategic card game where deception and psychology are as important as the cards in your hand.
          </p>
          <ul>
            <li>🎯 Declare your intent to score points</li>
            <li>🧠 Outsmart opponents through bluffing</li>
            <li>⚡ Call showdowns at the perfect moment</li>
            <li>🏆 Use the Hoarder's Multiplier to maximize scores</li>
          </ul>
        </div>

        <div className="welcome-actions">
          <button 
            className="primary-button"
            onClick={() => setCurrentScreen('game_mode_select')}
          >
            Continue
          </button>
          
          <button 
            className="secondary-button quick-play"
            onClick={handleSkipToGame}
          >
            Quick Play
          </button>
        </div>

        <div className="welcome-footer">
          <p>Press Enter to continue or Space for Quick Play</p>
        </div>
      </div>
    </div>
  )
}