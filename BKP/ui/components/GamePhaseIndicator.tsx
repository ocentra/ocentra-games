import React from 'react'
import { GamePhase } from '@/types'
import './GamePhaseIndicator.css'

interface GamePhaseIndicatorProps {
  currentPhase: GamePhase
  currentPlayerName?: string
  timeRemaining?: number
}

export const GamePhaseIndicator: React.FC<GamePhaseIndicatorProps> = ({
  currentPhase,
  currentPlayerName,
  timeRemaining
}) => {
  const getPhaseDisplayName = (phase: GamePhase): string => {
    switch (phase) {
      case GamePhase.DEALING:
        return 'Dealing Cards'
      case GamePhase.FLOOR_REVEAL:
        return 'Floor Card Reveal'
      case GamePhase.PLAYER_ACTION:
        return 'Player Actions'
      case GamePhase.SHOWDOWN:
        return 'Showdown'
      case GamePhase.SCORING:
        return 'Scoring'
      case GamePhase.GAME_END:
        return 'Game End'
      default:
        return phase
    }
  }

  const getPhaseDescription = (phase: GamePhase): string => {
    switch (phase) {
      case GamePhase.DEALING:
        return 'Preparing the game...'
      case GamePhase.FLOOR_REVEAL:
        return currentPlayerName 
          ? `${currentPlayerName} can pick up or decline the floor card`
          : 'Waiting for player to act on floor card'
      case GamePhase.PLAYER_ACTION:
        return currentPlayerName 
          ? `${currentPlayerName}'s turn to declare intent or call showdown`
          : 'Waiting for player action'
      case GamePhase.SHOWDOWN:
        return 'Showdown phase - undeclared players can make rebuttals'
      case GamePhase.SCORING:
        return 'Calculating final scores...'
      case GamePhase.GAME_END:
        return 'Game completed'
      default:
        return ''
    }
  }

  const getPhaseColor = (phase: GamePhase): string => {
    switch (phase) {
      case GamePhase.DEALING:
        return 'dealing'
      case GamePhase.FLOOR_REVEAL:
        return 'floor-reveal'
      case GamePhase.PLAYER_ACTION:
        return 'player-action'
      case GamePhase.SHOWDOWN:
        return 'showdown'
      case GamePhase.SCORING:
        return 'scoring'
      case GamePhase.GAME_END:
        return 'game-end'
      default:
        return 'default'
    }
  }

  return (
    <div className={`phase-indicator ${getPhaseColor(currentPhase)}`}>
      <div className="phase-header">
        <h2 className="phase-title">{getPhaseDisplayName(currentPhase)}</h2>
        {timeRemaining !== undefined && timeRemaining > 0 && (
          <div className="timer">{timeRemaining}s</div>
        )}
      </div>
      <p className="phase-description">{getPhaseDescription(currentPhase)}</p>
    </div>
  )
}