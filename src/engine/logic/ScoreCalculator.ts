import { type Card, type Player, type GameState } from '@/types'

export interface ScoreBreakdown {
  baseScore: number
  multiplier: number
  positivePoints: number
  penalties: number
  bonuses: number
  totalScore: number
  bonusDetails: {
    cleanSweep: boolean
    longRuns: number
  }
  sequences: {
    declaredSuitSequences: SequenceInfo[]
    penaltySequences: SequenceInfo[]
  }
}

export interface SequenceInfo {
  cards: Card[]
  sequenceValue: number
  sequenceLength: number
}

export class ScoreCalculator {
  /**
   * Calculates the final score for a player using CLAIM's Hoarder's Multiplier system
   */
  calculatePlayerScore(player: Player): ScoreBreakdown {
    if (!player.declaredSuit) {
      return this.calculateUndeclaredPenalty(player)
    }

    return this.calculateDeclaredScore(player)
  }

  /**
   * Calculates score for declared players using sequence-based method
   */
  private calculateDeclaredScore(player: Player): ScoreBreakdown {
    const declaredSuit = player.declaredSuit!
    
    // Separate cards by declared suit
    const suitCards = player.hand.filter(card => card.suit === declaredSuit)
    const penaltyCards = player.hand.filter(card => card.suit !== declaredSuit)

    // Find sequences in declared suit cards
    const declaredSuitSequences = this.findSequences(suitCards)
    
    // Find sequences in penalty cards
    const penaltySequences = this.findSequences(penaltyCards)

    // Calculate sequence-based score for declared suit
    const sequencePoints = this.calculateSequencePoints(declaredSuitSequences)
    
    // Multiplier: number of declared suit cards
    const multiplier = suitCards.length
    
    // Positive points: sequence points × multiplier
    const positivePoints = sequencePoints * multiplier
    
    // Penalties: sum of non-declared suit card values (using sequence-based calculation)
    const penaltyPoints = this.calculateSequencePoints(penaltySequences)
    const penalties = penaltyPoints
    
    // Bonuses
    const bonusDetails = this.calculateBonuses(suitCards, penaltyCards)
    const bonuses = this.calculateBonusPoints(bonusDetails)
    
    // Track budget usage for 1352-point budget system
    const budgetUsage = this.calculateBudgetUsage([...declaredSuitSequences, ...penaltySequences]);
    
    // Check if budget is exceeded (simplified check)
    if (budgetUsage > 1352) {
      console.warn(`Player ${player.name} exceeded 1352-point budget: ${budgetUsage}`);
    }
    
    // Total score
    const totalScore = positivePoints + bonuses - penalties

    return {
      baseScore: sequencePoints,
      multiplier,
      positivePoints,
      penalties,
      bonuses,
      totalScore,
      bonusDetails,
      sequences: {
        declaredSuitSequences,
        penaltySequences
      }
    }
  }

  /**
   * Calculates penalty for undeclared players using negative sequence calculations
   */
  private calculateUndeclaredPenalty(player: Player): ScoreBreakdown {
    // Find sequences in all cards (negative scoring)
    const allSequences = this.findSequences(player.hand)
    
    // Calculate negative sequence points
    const sequencePoints = this.calculateSequencePoints(allSequences)
    const handSize = player.hand.length
    const totalScore = -(sequencePoints * handSize)

    return {
      baseScore: 0,
      multiplier: 0,
      positivePoints: 0,
      penalties: sequencePoints * handSize,
      bonuses: 0,
      totalScore,
      bonusDetails: {
        cleanSweep: false,
        longRuns: 0,
      },
      sequences: {
        declaredSuitSequences: [],
        penaltySequences: allSequences
      }
    }
  }

  /**
   * Find sequences in a set of cards with A-K wraparound to 2
   */
  private findSequences(cards: Card[]): SequenceInfo[] {
    if (cards.length === 0) return []

    // Group cards by suit
    const cardsBySuit: Record<string, Card[]> = {}
    cards.forEach(card => {
      if (!cardsBySuit[card.suit]) {
        cardsBySuit[card.suit] = []
      }
      cardsBySuit[card.suit].push(card)
    })

    const sequences: SequenceInfo[] = []

    // Process each suit
    Object.values(cardsBySuit).forEach(suitCards => {
      // Sort cards by value
      const sortedCards = [...suitCards].sort((a, b) => a.value - b.value)
      
      // Handle wraparound: Ace (14) can connect to 2
      const hasAce = sortedCards.some(card => card.value === 14)
      const hasTwo = sortedCards.some(card => card.value === 2)
      
      if (hasAce && hasTwo) {
        // For wraparound detection, we'll use a more sophisticated approach
        // Split into two sequences: one including Ace and one including 2
        const aceSequence = sortedCards.filter(card => card.value >= 13 || card.value === 14);
        const twoSequence = sortedCards.filter(card => card.value <= 3 || card.value === 14);
        
        // Find sequences in each
        if (aceSequence.length >= 2) {
          sequences.push(...this.findSequencesInSortedCards(aceSequence))
        }
        if (twoSequence.length >= 2) {
          sequences.push(...this.findSequencesInSortedCards(twoSequence))
        }
      } else {
        // No wraparound needed, find sequences normally
        sequences.push(...this.findSequencesInSortedCards(sortedCards))
      }
    })

    return sequences
  }

  /**
   * Find sequences in a sorted array of cards
   */
  private findSequencesInSortedCards(sortedCards: Card[]): SequenceInfo[] {
    if (sortedCards.length === 0) return []

    const sequences: SequenceInfo[] = []
    let currentSequence: Card[] = [sortedCards[0]]
    
    for (let i = 1; i < sortedCards.length; i++) {
      const currentCard = sortedCards[i]
      const previousCard = sortedCards[i - 1]
      
      // Check if current card continues the sequence
      if (currentCard.value === previousCard.value + 1) {
        currentSequence.push(currentCard)
      } else {
        // End current sequence if it has at least 2 cards
        if (currentSequence.length >= 2) {
          sequences.push({
            cards: currentSequence,
            sequenceValue: currentSequence.reduce((sum, card) => sum + card.value, 0),
            sequenceLength: currentSequence.length
          })
        }
        // Start new sequence
        currentSequence = [currentCard]
      }
    }
    
    // Don't forget the last sequence
    if (currentSequence.length >= 2) {
      sequences.push({
        cards: currentSequence,
        sequenceValue: currentSequence.reduce((sum, card) => sum + card.value, 0),
        sequenceLength: currentSequence.length
      })
    }
    
    return sequences
  }

  /**
   * Calculate points based on sequences
   */
  private calculateSequencePoints(sequences: SequenceInfo[]): number {
    return sequences.reduce((total, sequence) => {
      // Each sequence contributes its total value
      return total + sequence.sequenceValue
    }, 0)
  }

  /**
   * Calculates bonus details for declared players
   */
  private calculateBonuses(suitCards: Card[], penaltyCards: Card[]): {
    cleanSweep: boolean
    longRuns: number
  } {
    // Clean Sweep: hand contains only declared suit cards
    const cleanSweep = penaltyCards.length === 0

    // Long Run: count runs of 4+ consecutive cards in declared suit
    const longRuns = this.countLongRuns(suitCards)

    return { cleanSweep, longRuns }
  }

  /**
   * Converts bonus details to bonus points
   */
  private calculateBonusPoints(bonusDetails: { cleanSweep: boolean; longRuns: number }): number {
    let bonuses = 0
    
    if (bonusDetails.cleanSweep) {
      bonuses += 50 // Clean Sweep bonus
    }
    
    bonuses += bonusDetails.longRuns * 25 // Long Run bonus (25 per run)
    
    return bonuses
  }

  /**
   * Counts the number of runs of 4+ consecutive cards in the same suit
   */
  private countLongRuns(cards: Card[]): number {
    if (cards.length < 4) return 0

    // Sort cards by value
    const sortedValues = cards.map(card => card.value).sort((a, b) => a - b)
    
    let runs = 0
    let currentRunLength = 1
    
    for (let i = 1; i < sortedValues.length; i++) {
      if (sortedValues[i] === sortedValues[i - 1] + 1) {
        currentRunLength++
      } else if (sortedValues[i] !== sortedValues[i - 1]) {
        // End of run (ignore duplicates)
        if (currentRunLength >= 4) {
          runs++
        }
        currentRunLength = 1
      }
    }
    
    // Check final run
    if (currentRunLength >= 4) {
      runs++
    }
    
    return runs
  }

  /**
   * Calculates scores for all players in the game
   */
  calculateAllScores(gameState: GameState): Map<string, ScoreBreakdown> {
    const scores = new Map<string, ScoreBreakdown>()
    
    for (const player of gameState.players) {
      scores.set(player.id, this.calculatePlayerScore(player))
    }
    
    return scores
  }

  /**
   * Determines the winner(s) of the game
   */
  determineWinners(gameState: GameState): {
    winners: Player[]
    scores: Map<string, ScoreBreakdown>
  } {
    const scores = this.calculateAllScores(gameState)
    
    // Find highest score
    let highestScore = -Infinity
    for (const scoreBreakdown of scores.values()) {
      if (scoreBreakdown.totalScore > highestScore) {
        highestScore = scoreBreakdown.totalScore
      }
    }
    
    // Find all players with highest score (ties possible)
    const winners = gameState.players.filter(player => {
      const playerScore = scores.get(player.id)
      return playerScore && playerScore.totalScore === highestScore
    })
    
    return { winners, scores }
  }

  /**
   * Validates a rebuttal (3-card run) and calculates its impact
   */
  validateRebuttal(cards: Card[]): {
    isValid: boolean
    runValue: number
  } {
    if (cards.length !== 3) {
      return { isValid: false, runValue: 0 }
    }

    // All cards must be same suit
    const suit = cards[0].suit
    if (!cards.every(card => card.suit === suit)) {
      return { isValid: false, runValue: 0 }
    }

    // Sort by value and check if consecutive
    const sortedValues = cards.map(card => card.value).sort((a, b) => a - b)
    const isConsecutive = sortedValues[1] === sortedValues[0] + 1 && 
                         sortedValues[2] === sortedValues[1] + 1

    if (!isConsecutive) {
      return { isValid: false, runValue: 0 }
    }

    // Calculate run value (sum of the three cards)
    const runValue = sortedValues.reduce((sum, value) => sum + value, 0)
    
    return { isValid: true, runValue }
  }

  /**
   * Track 1352-point budget system
   */
  calculateBudgetUsage(sequences: SequenceInfo[]): number {
    // The 1352-point budget system tracks the total value of all sequences
    return sequences.reduce((total, sequence) => total + sequence.sequenceValue, 0)
  }
}