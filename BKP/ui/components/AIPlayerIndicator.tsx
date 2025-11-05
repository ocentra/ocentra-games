import { type Player, AIPersonality } from '@/types'

interface AIPlayerIndicatorProps {
  player: Player
  isActive: boolean
}

export function AIPlayerIndicator({ player, isActive }: AIPlayerIndicatorProps) {
  if (!player.isAI) return null

  const getPersonalityClass = (personality: AIPersonality | undefined) => {
    switch (personality) {
      case AIPersonality.AGGRESSIVE:
        return 'personality-aggressive'
      case AIPersonality.CONSERVATIVE:
        return 'personality-conservative'
      case AIPersonality.ADAPTIVE:
        return 'personality-adaptive'
      case AIPersonality.UNPREDICTABLE:
        return 'personality-unpredictable'
      default:
        return 'personality-default'
    }
  }

  const getPersonalityLabel = (personality: AIPersonality | undefined) => {
    switch (personality) {
      case AIPersonality.AGGRESSIVE:
        return 'Aggressive'
      case AIPersonality.CONSERVATIVE:
        return 'Conservative'
      case AIPersonality.ADAPTIVE:
        return 'Adaptive'
      case AIPersonality.UNPREDICTABLE:
        return 'Unpredictable'
      default:
        return 'AI'
    }
  }

  return (
    <div className={`ai-player-indicator ${isActive ? 'active' : ''}`}>
      <div className={`personality-badge ${getPersonalityClass(player.aiPersonality)}`}>
        {getPersonalityLabel(player.aiPersonality)}
      </div>
      <div className="ai-thinking">
        {isActive && <span className="thinking-dots">...</span>}
      </div>
    </div>
  )
}