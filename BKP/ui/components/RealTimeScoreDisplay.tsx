import React from 'react'
import { type Player } from '@/types'
import './RealTimeScoreDisplay.css'

interface RealTimeScoreDisplayProps {
  players: Player[]
  currentPlayerId?: string
}

export const RealTimeScoreDisplay: React.FC<RealTimeScoreDisplayProps> = ({
  players,
  currentPlayerId
}) => {
  return (
    <div className="real-time-score-display">
      <h3>Live Scores</h3>
      <div className="score-list">
        {players.map((player) => (
          <div 
            key={player.id} 
            className={`score-item ${player.id === currentPlayerId ? 'current-player' : ''}`}
          >
            <div className="player-info">
              <span className="player-name">{player.name}</span>
              {player.declaredSuit && (
                <span className="declared-suit">{player.declaredSuit.toUpperCase()}</span>
              )}
            </div>
            <div className="score-value">
              {player.score >= 0 ? '+' : ''}{player.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}