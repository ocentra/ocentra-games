import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useGameEngine } from '@/hooks/useGameEngine'
import { logUI } from '@/utils/logger'

interface GameSetupData {
  playerCount: number
  aiPlayers: number
  humanPlayers: number
  difficulty: 'easy' | 'medium' | 'hard'
  gameMode: 'quick' | 'ranked' | 'custom'
}

export function GameSetupCarousel() {
  const { setCurrentScreen, initializeEngine } = useGameStore()
  const { gameEngine, initializeGame, startSinglePlayer } = useGameEngine()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [gameSetup, setGameSetup] = useState<GameSetupData>({
    playerCount: 4,
    aiPlayers: 3,
    humanPlayers: 1,
    difficulty: 'medium',
    gameMode: 'quick',
  })

  const slides = [
    {
      id: 'rules',
      title: 'How to Play',
      component: <RulesSlide />,
    },
    {
      id: 'mode',
      title: 'Choose Game Mode',
      component: <GameModeSlide setCurrentScreen={setCurrentScreen} />,
    },
    {
      id: 'players',
      title: 'Setup Players',
      component: <PlayersSlide gameSetup={gameSetup} setGameSetup={setGameSetup} />,
    },
    {
      id: 'difficulty',
      title: 'Game Settings',
      component: <DifficultySlide gameSetup={gameSetup} setGameSetup={setGameSetup} />,
    },
    {
      id: 'ready',
      title: 'Ready to Play',
      component: <ReadySlide gameSetup={gameSetup} />,
    },
  ]

  const nextSlide = () => {
    logUI('Next slide clicked, current slide:', currentSlide)
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
      logUI('Moved to slide:', currentSlide + 1)
    }
  }

  const prevSlide = () => {
    logUI('Previous slide clicked, current slide:', currentSlide)
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
      logUI('Moved to slide:', currentSlide - 1)
    }
  }

  const goToSlide = (index: number) => {
    logUI('Go to slide clicked, index:', index)
    setCurrentSlide(index)
    logUI('Moved to slide:', index)
  }

  const startGame = async () => {
    // Pass game setup to game engine
    logUI('Starting game with setup:', gameSetup)
    
    // Initialize the game engine if it's not already available
    if (!gameEngine) {
      logUI('Game engine not available, initializing...')
      initializeEngine()
    }
    
    // Get the updated game engine after initialization
    const { gameEngine: updatedGameEngine } = useGameStore.getState()
    
    if (updatedGameEngine) {
      try {
        logUI('Game engine available, initializing game...')
        // Initialize the game with the selected configuration
        await initializeGame({
          maxPlayers: gameSetup.playerCount,
          aiDifficulty: gameSetup.difficulty,
          enablePhysics: true,
        })
        
        logUI('Game initialized, starting single player game with difficulty:', gameSetup.difficulty)
        // Start single player game with the selected difficulty
        await startSinglePlayer(gameSetup.difficulty)
        
        logUI('Game started, navigating to game screen')
        // Set the screen to game
        setCurrentScreen('game')
      } catch (error) {
        logUI('Failed to start game:', error)
        console.error('Failed to start game:', error)
      }
    } else {
      logUI('Game engine failed to initialize')
      console.error('Game engine failed to initialize')
      // Still navigate to game screen even if engine fails to start
      setCurrentScreen('game')
    }
  }

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        <h2>{slides[currentSlide].title}</h2>
        <div className="slide-indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="carousel-content">
        {slides[currentSlide].component}
      </div>

      <div className="carousel-navigation">
        <button
          className="nav-button secondary-button"
          onClick={() => setCurrentScreen('welcome')}
        >
          Back
        </button>

        {currentSlide === 1 ? (
          // Game Mode Selection - Show Single Player / Multiplayer buttons
          <div className="mode-selection-buttons">
            <button 
              className="nav-button primary-button"
              onClick={nextSlide}
            >
              Single Player
            </button>
            <button 
              className="nav-button secondary-button"
              onClick={() => setCurrentScreen('lobby')}
            >
              Multiplayer
            </button>
          </div>
        ) : (
          <div className="nav-controls">
            <button
              className="nav-button secondary-button"
              onClick={prevSlide}
              disabled={currentSlide === 0}
            >
              Previous
            </button>

            {currentSlide === slides.length - 1 ? (
              <button className="nav-button primary-button" onClick={startGame}>
                Start Game
              </button>
            ) : (
              <button className="nav-button primary-button" onClick={nextSlide}>
                Next
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}



function RulesSlide() {
  return (
    <div className="slide-content rules-slide">
      <div className="rules-grid">
        <div className="rule-card">
          <div className="rule-icon">🎯</div>
          <h4>Declare Intent</h4>
          <p>Choose a suit to collect. Only declared suits score positive points.</p>
        </div>
        
        <div className="rule-card">
          <div className="rule-icon">🔢</div>
          <h4>Hoarder's Multiplier</h4>
          <p>Score = (suit cards sum) × (suit cards count) - penalties + bonuses</p>
        </div>
        
        <div className="rule-card">
          <div className="rule-icon">⚡</div>
          <h4>Showdown</h4>
          <p>Any player can end the game immediately by calling a showdown.</p>
        </div>
        
        <div className="rule-card">
          <div className="rule-icon">🛡️</div>
          <h4>Rebuttals</h4>
          <p>Undeclared players can contest showdowns if they think they can win.</p>
        </div>
      </div>
      
      <div className="rules-summary">
        <p><strong>Goal:</strong> Score the highest points through strategic card collection and psychological warfare.</p>
      </div>
    </div>
  )
}

interface PlayersSlideProps {
  gameSetup: GameSetupData
  setGameSetup: (setup: GameSetupData) => void
}

function PlayersSlide({ gameSetup, setGameSetup }: PlayersSlideProps) {
  const updatePlayers = (aiCount: number, humanCount: number) => {
    setGameSetup({
      ...gameSetup,
      aiPlayers: aiCount,
      humanPlayers: humanCount,
      playerCount: aiCount + humanCount,
    })
  }

  const playerConfigs = [
    {
      name: 'Solo vs AI',
      description: 'You vs 3 AI opponents',
      ai: 3,
      human: 1,
      icon: '🤖',
    },
    {
      name: 'Duo vs AI',
      description: '2 humans vs 2 AI opponents',
      ai: 2,
      human: 2,
      icon: '👥',
    },
    {
      name: 'Trio vs AI',
      description: '3 humans vs 1 AI opponent',
      ai: 1,
      human: 3,
      icon: '👨‍👩‍👧',
    },
    {
      name: 'All Human',
      description: '4 human players (local/online)',
      ai: 0,
      human: 4,
      icon: '👨‍👩‍👧‍👦',
    },
  ]

  return (
    <div className="slide-content players-slide">
      <div className="players-intro">
        <h3>Choose Your Opponents</h3>
        <p>CLAIM is best played with 4 players. Configure your mix of AI and human opponents.</p>
      </div>
      
      <div className="player-configs">
        {playerConfigs.map((config, index) => (
          <button
            key={index}
            className={`player-config ${
              gameSetup.aiPlayers === config.ai && gameSetup.humanPlayers === config.human
                ? 'selected'
                : ''
            }`}
            onClick={() => updatePlayers(config.ai, config.human)}
          >
            <div className="config-icon">{config.icon}</div>
            <div className="config-info">
              <div className="config-name">{config.name}</div>
              <div className="config-description">{config.description}</div>
              <div className="config-breakdown">
                {config.human > 0 && <span className="human-count">{config.human} Human</span>}
                {config.ai > 0 && <span className="ai-count">{config.ai} AI</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DifficultySlide({ gameSetup, setGameSetup }: PlayersSlideProps) {
  const difficulties = [
    {
      level: 'easy' as const,
      name: 'Casual',
      description: 'AI makes basic moves, perfect for learning',
      icon: '🌱',
      color: 'green',
    },
    {
      level: 'medium' as const,
      name: 'Competitive',
      description: 'AI uses strategy and occasional bluffs',
      icon: '⚖️',
      color: 'yellow',
    },
    {
      level: 'hard' as const,
      name: 'Expert',
      description: 'AI masters psychology and advanced tactics',
      icon: '🔥',
      color: 'red',
    },
  ]

  const gameModes = [
    {
      mode: 'quick' as const,
      name: 'Quick Game',
      description: 'Jump straight into action',
    },
    {
      mode: 'ranked' as const,
      name: 'Ranked Match',
      description: 'Competitive play with rankings',
    },
    {
      mode: 'custom' as const,
      name: 'Custom Rules',
      description: 'Modify game parameters',
    },
  ]

  return (
    <div className="slide-content difficulty-slide">
      <div className="settings-section">
        <h3>AI Difficulty</h3>
        <div className="difficulty-options">
          {difficulties.map((diff) => (
            <button
              key={diff.level}
              className={`difficulty-option ${gameSetup.difficulty === diff.level ? 'selected' : ''}`}
              onClick={() => setGameSetup({ ...gameSetup, difficulty: diff.level })}
            >
              <div className="difficulty-icon">{diff.icon}</div>
              <div className="difficulty-info">
                <div className="difficulty-name">{diff.name}</div>
                <div className="difficulty-description">{diff.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>Game Mode</h3>
        <div className="mode-options">
          {gameModes.map((mode) => (
            <button
              key={mode.mode}
              className={`mode-option ${gameSetup.gameMode === mode.mode ? 'selected' : ''}`}
              onClick={() => setGameSetup({ ...gameSetup, gameMode: mode.mode })}
            >
              <div className="mode-name">{mode.name}</div>
              <div className="mode-description">{mode.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ReadySlideProps {
  gameSetup: GameSetupData
}

interface GameModeSlideProps {
  setCurrentScreen: (screen: import('@/types').GameScreen) => void
}

function GameModeSlide({ setCurrentScreen }: GameModeSlideProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = setCurrentScreen // Keep variable to satisfy interface but mark as unused
  return (
    <div className="slide-content mode-select-slide">
      <div className="mode-select-header">
        <h3>Choose Your Experience</h3>
        <p>How would you like to play CLAIM?</p>
      </div>

      <div className="mode-select-options">
        <div className="mode-option-card single-player">
          <div className="mode-icon">🤖</div>
          <h4>Single Player</h4>
          <p>Play against AI opponents with customizable difficulty and player configurations</p>
          <ul>
            <li>Choose AI difficulty levels</li>
            <li>Mix of human and AI players</li>
            <li>Perfect for learning and practice</li>
          </ul>
        </div>

        <div className="mode-option-card multiplayer">
          <div className="mode-icon">🌐</div>
          <h4>Multiplayer</h4>
          <p>Play with friends online in real-time matches</p>
          <ul>
            <li>Create or join game rooms</li>
            <li>Voice chat support</li>
            <li>Ranked competitive play</li>
          </ul>
          <div className="coming-soon">Coming Soon</div>
        </div>
      </div>
    </div>
  )
}

function ReadySlide({ gameSetup }: ReadySlideProps) {
  return (
    <div className="slide-content ready-slide">
      <div className="ready-header">
        <h3>🎮 Ready to Play!</h3>
        <p>Your game is configured and ready to start.</p>
      </div>

      <div className="game-summary">
        <div className="summary-card">
          <h4>Game Configuration</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Players:</span>
              <span className="value">{gameSetup.playerCount} Total</span>
            </div>
            <div className="summary-item">
              <span className="label">Humans:</span>
              <span className="value">{gameSetup.humanPlayers}</span>
            </div>
            <div className="summary-item">
              <span className="label">AI:</span>
              <span className="value">{gameSetup.aiPlayers}</span>
            </div>
            <div className="summary-item">
              <span className="label">Difficulty:</span>
              <span className="value">{gameSetup.difficulty}</span>
            </div>
            <div className="summary-item">
              <span className="label">Mode:</span>
              <span className="value">{gameSetup.gameMode}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ready-tips">
        <h4>💡 Quick Tips</h4>
        <ul>
          <li>Watch other players' actions for tells</li>
          <li>Don't always declare your strongest suit</li>
          <li>Time your showdowns carefully</li>
          <li>Use rebuttals strategically</li>
        </ul>
      </div>
    </div>
  )
}