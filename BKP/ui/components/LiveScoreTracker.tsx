import React, { useState, useEffect } from 'react'
import { ScoreCalculator } from '@/engine/logic/ScoreCalculator'
import { type GameState, type Player } from '@/types'
import './LiveScoreTracker.css'

interface LiveScoreTrackerProps {
  gameState: GameState
  currentPlayer?: Player
  compact?: boolean
}

export const LiveScoreTracker: React.FC<LiveScoreTrackerProps> = ({
  gameState,
  currentPlayer,
  compact = false,
}) => {
  const [scoreCalculator] = useState(() => new ScoreCalculator())
  const [previousScores, setPreviousScores] = useState<Map<string, number>>(new Map())
  
  const scores = scoreCalculator.calculateAllScores(gameState)
  
  // Track score changes for animations
  useEffect(() => {
    const newScores = new Map<string, number>()
    scores.forEach((breakdown, playerId) => {
      newScores.set(playerId, breakdown.totalScore)
    })
    setPreviousScores(newScores)
  }, [scores])

  const sortedPlayers = [...gameState.players].sort((a, b) => {
    const scoreA = scores.get(a.id)?.totalScore ?? 0
    const scoreB = scores.get(b.id)?.totalScore ?? 0
    return scoreB - scoreA
  })

  if (compact) {
    return (
      <div className="live-score-tracker compact">
        <div className="compact-scores">
          {sortedPlayers.map((player, index) => {
            const scoreBreakdown = scores.get(player.id)
            const score = scoreBreakdown?.totalScore ?? 0
            const isCurrentPlayer = currentPlayer?.id === player.id
            
            return (
              <div
                key={player.id}
                className={`compact-score-item ${isCurrentPlayer ? 'current' : ''}`}
              >
                <div className="compact-rank">#{index + 1}</div>
                <div className="compact-name">{player.name}</div>
                <div className={`compact-score ${score >= 0 ? 'positive' : 'negative'}`}>
                  {score >= 0 ? '+' : ''}{score}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="live-score-tracker">
      <div className="tracker-header">
        <h3>Live Scores</h3>
        <div className="round-info">Round {gameState.round}</div>
      </div>
      
      <div className="live-scores">
        {sortedPlayers.map((player, index) => {
          const scoreBreakdown = scores.get(player.id)
          if (!scoreBreakdown) return null
          
          const score = scoreBreakdown.totalScore
          const previousScore = previousScores.get(player.id) ?? 0
          const scoreChange = score - previousScore
          const isCurrentPlayer = currentPlayer?.id === player.id
          
          return (
            <div
              key={player.id}
              className={`live-score-item ${isCurrentPlayer ? 'current' : ''}`}
            >
              <div className="player-position">
                <div className="position-rank">#{index + 1}</div>
                <div className="player-details">
                  <div className="player-name">{player.name}</div>
                  {player.declaredSuit && (
                    <div className="declared-suit">
                      {player.declaredSuit.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="score-info">
                <div className={`current-score ${score >= 0 ? 'positive' : 'negative'}`}>
                  {score >= 0 ? '+' : ''}{score}
                </div>
                
                {scoreChange !== 0 && (
                  <div className={`score-change ${scoreChange > 0 ? 'increase' : 'decrease'}`}>
                    {scoreChange > 0 ? '+' : ''}{scoreChange}
                  </div>
                )}
                
                <div className="score-details">
                  {player.declaredSuit ? (
                    <div className="declared-info">
                      <span>Cards: {scoreBreakdown.multiplier}</span>
                      {scoreBreakdown.bonusDetails.cleanSweep && (
                        <span className="bonus-indicator">🧹</span>
                      )}
                      {scoreBreakdown.bonusDetails.longRuns > 0 && (
                        <span className="bonus-indicator">🏃‍♂️</span>
                      )}
                    </div>
                  ) : (
                    <div className="undeclared-info">
                      <span>Undeclared ({player.hand.length} cards)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}