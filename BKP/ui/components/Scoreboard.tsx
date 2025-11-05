import React, { useState, useEffect } from 'react'
import { ScoreDisplay } from './ScoreDisplay'
import { ScoreCalculator } from '@/engine/logic/ScoreCalculator'
import { type GameState } from '@/types'
import './Scoreboard.css'

interface ScoreboardProps {
  gameState: GameState
  showAnimation?: boolean
  onAnimationComplete?: () => void
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  gameState,
  showAnimation = false,
  onAnimationComplete,
}) => {
  const [scoreCalculator] = useState(() => new ScoreCalculator())
  const [animationPhase, setAnimationPhase] = useState<'hidden' | 'revealing' | 'complete'>('hidden')
  
  useEffect(() => {
    if (showAnimation) {
      setAnimationPhase('revealing')
      const timer = setTimeout(() => {
        setAnimationPhase('complete')
        onAnimationComplete?.()
      }, 2500) // Total animation duration
      
      return () => clearTimeout(timer)
    }
  }, [showAnimation, onAnimationComplete])

  const { winners, scores } = scoreCalculator.determineWinners(gameState)
  const winnerIds = new Set(winners.map(w => w.id))

  // Sort players by score (highest first)
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    const scoreA = scores.get(a.id)?.totalScore ?? 0
    const scoreB = scores.get(b.id)?.totalScore ?? 0
    return scoreB - scoreA
  })

  return (
    <div className={`scoreboard ${animationPhase}`}>
      <div className="scoreboard-header">
        <h2>Final Scores</h2>
        {winners.length === 1 ? (
          <div className="winner-announcement">
            🏆 {winners[0].name} Wins!
          </div>
        ) : (
          <div className="winner-announcement">
            🏆 Tie Game! ({winners.length} winners)
          </div>
        )}
      </div>
      
      <div className="scores-container">
        {sortedPlayers.map((player, index) => {
          const scoreBreakdown = scores.get(player.id)
          if (!scoreBreakdown) return null
          
          return (
            <div
              key={player.id}
              className="score-item"
              style={{
                animationDelay: showAnimation ? `${index * 0.3}s` : '0s'
              }}
            >
              <div className="rank">#{index + 1}</div>
              <ScoreDisplay
                player={player}
                scoreBreakdown={scoreBreakdown}
                isWinner={winnerIds.has(player.id)}
                showAnimation={showAnimation}
              />
            </div>
          )
        })}
      </div>
      
      <div className="scoreboard-footer">
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">Round:</span>
            <span className="stat-value">{gameState.round}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Players:</span>
            <span className="stat-value">{gameState.players.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Declared:</span>
            <span className="stat-value">
              {gameState.players.filter(p => p.declaredSuit).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}