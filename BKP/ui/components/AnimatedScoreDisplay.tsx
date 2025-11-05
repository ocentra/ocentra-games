import React, { useEffect } from 'react'
import { type ScoreBreakdown } from '@/engine/logic/ScoreCalculator'
import { type Player } from '@/types'
import { useScoreBreakdownAnimation } from '@/ui/hooks/useScoreAnimation'
import './AnimatedScoreDisplay.css'

interface AnimatedScoreDisplayProps {
  player: Player
  scoreBreakdown: ScoreBreakdown
  isWinner?: boolean
  autoStart?: boolean
  sequential?: boolean
  onAnimationComplete?: () => void
}

export const AnimatedScoreDisplay: React.FC<AnimatedScoreDisplayProps> = ({
  player,
  scoreBreakdown,
  isWinner = false,
  autoStart = true,
  sequential = true,
  onAnimationComplete,
}) => {
  const {
    animations,
    startSequentialAnimation,
    startParallelAnimation,
    isAnyAnimating,
  } = useScoreBreakdownAnimation(scoreBreakdown, {
    duration: 1500,
    onComplete: onAnimationComplete,
  })

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        if (sequential) {
          startSequentialAnimation()
        } else {
          startParallelAnimation()
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [autoStart, sequential, startSequentialAnimation, startParallelAnimation])

  const isDeclared = player.declaredSuit !== null

  return (
    <div className={`animated-score-display ${isWinner ? 'winner' : ''} ${isAnyAnimating ? 'animating' : ''}`}>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        {isDeclared && (
          <div className="declared-suit">
            Declared: {player.declaredSuit?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="animated-score-breakdown">
        {isDeclared ? (
          <>
            <div className="animated-score-line positive">
              <span className="label">Base Score:</span>
              <span className="animated-value">
                {animations.baseScore.currentValue}
              </span>
            </div>
            
            <div className="animated-score-line positive">
              <span className="label">Multiplier:</span>
              <span className="animated-value">
                ×{animations.multiplier.currentValue}
              </span>
            </div>
            
            <div className="animated-score-line positive major">
              <span className="label">Positive Points:</span>
              <span className="animated-value">
                +{animations.positivePoints.currentValue}
              </span>
            </div>
            
            {scoreBreakdown.penalties > 0 && (
              <div className="animated-score-line negative">
                <span className="label">Penalties:</span>
                <span className="animated-value">
                  -{animations.penalties.currentValue}
                </span>
              </div>
            )}
            
            {scoreBreakdown.bonuses > 0 && (
              <div className="animated-score-line bonus">
                <span className="label">Bonuses:</span>
                <span className="animated-value">
                  +{animations.bonuses.currentValue}
                </span>
                <div className="bonus-details">
                  {scoreBreakdown.bonusDetails.cleanSweep && (
                    <div className="bonus-item animate-in">
                      Clean Sweep: +50
                    </div>
                  )}
                  {scoreBreakdown.bonusDetails.longRuns > 0 && (
                    <div className="bonus-item animate-in">
                      Long Run{scoreBreakdown.bonusDetails.longRuns > 1 ? 's' : ''}: +{scoreBreakdown.bonusDetails.longRuns * 25}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="animated-score-line negative major">
            <span className="label">Undeclared Penalty:</span>
            <span className="animated-value">
              -{animations.penalties.currentValue}
            </span>
          </div>
        )}
        
        <div className={`animated-score-line total ${animations.totalScore.currentValue >= 0 ? 'positive' : 'negative'}`}>
          <span className="label">Total Score:</span>
          <span className="animated-value total-value">
            {animations.totalScore.currentValue >= 0 ? '+' : ''}{animations.totalScore.currentValue}
          </span>
        </div>
      </div>

      {/* Progress indicators */}
      <div className="animation-progress">
        {Object.entries(animations).map(([key, animation]) => (
          <div
            key={key}
            className={`progress-dot ${animation.isAnimating ? 'active' : ''} ${animation.progress === 1 ? 'complete' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}