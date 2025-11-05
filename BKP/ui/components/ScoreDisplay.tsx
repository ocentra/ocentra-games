import React from 'react'
import { type ScoreBreakdown } from '@/engine/logic/ScoreCalculator'
import { type Player } from '@/types'
import './ScoreDisplay.css'

interface ScoreDisplayProps {
  player: Player
  scoreBreakdown: ScoreBreakdown
  isWinner?: boolean
  showAnimation?: boolean
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  player,
  scoreBreakdown,
  isWinner = false,
  showAnimation = false,
}) => {
  const {
    baseScore,
    multiplier,
    positivePoints,
    penalties,
    bonuses,
    totalScore,
    bonusDetails,
  } = scoreBreakdown

  const isDeclared = player.declaredSuit !== null

  return (
    <div className={`score-display ${isWinner ? 'winner' : ''} ${showAnimation ? 'animate' : ''}`}>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        {isDeclared && (
          <div className="declared-suit">
            Declared: {player.declaredSuit?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="score-breakdown">
        {isDeclared ? (
          <>
            <div className="score-line positive">
              <span className="label">Base Score:</span>
              <span className="value">{baseScore}</span>
            </div>
            <div className="score-line positive">
              <span className="label">Multiplier:</span>
              <span className="value">×{multiplier}</span>
            </div>
            <div className="score-line positive major">
              <span className="label">Positive Points:</span>
              <span className="value">+{positivePoints}</span>
            </div>
            
            {penalties > 0 && (
              <div className="score-line negative">
                <span className="label">Penalties:</span>
                <span className="value">-{penalties}</span>
              </div>
            )}
            
            {bonuses > 0 && (
              <div className="score-line bonus">
                <span className="label">Bonuses:</span>
                <span className="value">+{bonuses}</span>
                <div className="bonus-details">
                  {bonusDetails.cleanSweep && (
                    <div className="bonus-item">Clean Sweep: +50</div>
                  )}
                  {bonusDetails.longRuns > 0 && (
                    <div className="bonus-item">
                      Long Run{bonusDetails.longRuns > 1 ? 's' : ''}: +{bonusDetails.longRuns * 25}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="score-line negative major">
            <span className="label">Undeclared Penalty:</span>
            <span className="value">-{penalties}</span>
          </div>
        )}
        
        <div className={`score-line total ${totalScore >= 0 ? 'positive' : 'negative'}`}>
          <span className="label">Total Score:</span>
          <span className="value">{totalScore >= 0 ? '+' : ''}{totalScore}</span>
        </div>
      </div>
    </div>
  )
}