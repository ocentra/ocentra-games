import React, { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ActionPanel } from './ActionPanel'
import { GamePhaseIndicator } from './GamePhaseIndicator'
import { RealTimeScoreDisplay } from './RealTimeScoreDisplay'
import { SettingsPanel } from './SettingsPanel'
import { Suit } from '@/types'

interface GameSettings {
  musicVolume: number
  soundEffectsVolume: number
  showAnimations: boolean
  cardQuality: 'low' | 'medium' | 'high'
  enableHints: boolean
}

export const GameUI: React.FC = () => {
  const { gameState, gameEngine } = useGameStore()
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<GameSettings>({
    musicVolume: 80,
    soundEffectsVolume: 100,
    showAnimations: true,
    cardQuality: 'high',
    enableHints: true
  })

  // Handle declare intent action
  const handleDeclareIntent = (suit: Suit) => {
    if (!gameEngine || !gameState) return
    
    // In a real implementation, this would dispatch an action to the game engine
    console.log(`Declared intent for suit: ${suit}`)
    // gameEngine.handlePlayerAction({ type: 'declare_intent', playerId: gameState.players[gameState.currentPlayer].id, data: { suit } })
  }

  // Handle call showdown action
  const handleCallShowdown = () => {
    if (!gameEngine || !gameState) return
    
    console.log('Called showdown')
    // gameEngine.handlePlayerAction({ type: 'call_showdown', playerId: gameState.players[gameState.currentPlayer].id })
  }

  // Handle pick up card action
  const handlePickUpCard = () => {
    if (!gameEngine || !gameState) return
    
    console.log('Picked up floor card')
    // gameEngine.handlePlayerAction({ type: 'pick_up', playerId: gameState.players[gameState.currentPlayer].id })
  }

  // Handle decline card action
  const handleDeclineCard = () => {
    if (!gameEngine || !gameState) return
    
    console.log('Declined floor card')
    // gameEngine.handlePlayerAction({ type: 'decline', playerId: gameState.players[gameState.currentPlayer].id })
  }

  // Handle settings save
  const handleSaveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings)
    console.log('Settings saved:', newSettings)
    // In a real implementation, this would save to localStorage or send to backend
  }

  // If we don't have game state, don't render the UI
  if (!gameState) {
    return null
  }

  // Get current player
  const currentPlayer = gameState.players[gameState.currentPlayer]
  const isCurrentPlayer = true // In a real implementation, this would check if the current user is the active player

  return (
    <>
      {/* Game Phase Indicator */}
      <GamePhaseIndicator
        currentPhase={gameState.phase}
        currentPlayerName={currentPlayer?.name}
        timeRemaining={30} // In a real implementation, this would come from the game state
      />

      {/* Real-time Score Display */}
      <RealTimeScoreDisplay
        players={gameState.players}
        currentPlayerId={currentPlayer?.id}
      />

      {/* Action Panel */}
      <ActionPanel
        gamePhase={gameState.phase}
        onDeclareIntent={handleDeclareIntent}
        onCallShowdown={handleCallShowdown}
        onPickUpCard={handlePickUpCard}
        onDeclineCard={handleDeclineCard}
        currentPlayerCanAct={isCurrentPlayer}
        declaredSuit={currentPlayer?.declaredSuit || null}
      />

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(15, 52, 96, 0.8)',
          color: '#64b5f6',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 12px',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        Settings
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )
      }
      
      {/* Display current settings for debugging */}
      <div style={{ position: 'absolute', bottom: '10px', right: '10px', color: 'white', fontSize: '10px', opacity: 0.5 }}>
        Settings: {JSON.stringify(settings)}
      </div>
    </>
  )
}