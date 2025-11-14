// AIHelper.ts
// Helper class for constructing AI prompts from game state
// Adapted from Unity's AIHelper.cs

import { GameMode } from '@/gameMode/GameMode'
import { EventBus } from '@/lib/eventing/EventBus'
import {
  RequestPlayerHandDetailEvent,
  RequestScoreManagerDetailsEvent,
  RequestRemainingCardsCountEvent,
  RequestFloorCardsDetailEvent,
  RequestAllPlayersDataEvent,
} from '@/lib/eventing/events/game'
import type { Card, Player } from '@/types'

const prefix = '[AIHelper]'
const LOG_GENERAL = false

/**
 * AIHelper - Singleton helper for constructing AI prompts
 * Provides methods for building system and user prompts from game state
 */
export class AIHelper {
  private static instance: AIHelper | null = null

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AIHelper {
    if (!AIHelper.instance) {
      AIHelper.instance = new AIHelper()
    }
    return AIHelper.instance
  }

  /**
   * Construct system message from GameMode
   * @param gameMode - The game mode instance
   * @returns System prompt string
   */
  GetSystemMessage(gameMode: GameMode): string {
    const rules = gameMode.getGameRules()
    const description = gameMode.getGameDescription()
    const strategyTips = gameMode.getStrategyTips()
    const bonusRules = gameMode.getBonusRules()
    const moveValidity = gameMode.getMoveValidityConditions()
    const bluffSettings = gameMode.getBluffSettings()
    const examples = gameMode.getExampleHands()

    let systemMessage = `You are an AI assistant playing ${description}\n\n`
    systemMessage += `GAME RULES:\n${rules.LLM}\n\n`
    systemMessage += `BONUS RULES:\n${bonusRules}\n\n`
    systemMessage += `MOVE VALIDITY:\n${moveValidity}\n\n`
    systemMessage += `BLUFF SETTINGS:\n${bluffSettings}\n\n`

    if (strategyTips.length > 0) {
      systemMessage += `STRATEGY TIPS:\n`
      strategyTips.forEach((tip, index) => {
        systemMessage += `${index + 1}. ${tip}\n`
      })
      systemMessage += `\n`
    }

    if (examples.length > 0) {
      systemMessage += `EXAMPLE HANDS:\n`
      examples.forEach((example, index) => {
        systemMessage += `${index + 1}. ${example}\n`
      })
      systemMessage += `\n`
    }

    systemMessage += `Your goal is to make optimal decisions based on the current game state. `
    systemMessage += `Respond with a JSON object containing your decision: {"action": "pick_up"|"decline"|"declare_intent"|"call_showdown"|"rebuttal", "data": {...}, "reasoning": "brief explanation"}`

    return systemMessage
  }

  /**
   * Get current game state via events and format as user prompt
   * @param playerId - The player ID to get state for
   * @returns Promise resolving to user prompt string
   */
  async GetUserPrompt(playerId: string): Promise<string> {
    try {
      // Request game state information via events
      const handEvent = new RequestPlayerHandDetailEvent(playerId)
      const scoreEvent = new RequestScoreManagerDetailsEvent()
      const cardsCountEvent = new RequestRemainingCardsCountEvent()
      const floorCardsEvent = new RequestFloorCardsDetailEvent()
      const allPlayersEvent = new RequestAllPlayersDataEvent()

      // Publish events and wait for responses
      EventBus.instance.publish(handEvent)
      EventBus.instance.publish(scoreEvent)
      EventBus.instance.publish(cardsCountEvent)
      EventBus.instance.publish(floorCardsEvent)
      EventBus.instance.publish(allPlayersEvent)

      // Wait for deferred responses
      const [hand, scoreData, remainingCards, floorCards, allPlayers] = await Promise.all([
        handEvent.deferred.promise,
        scoreEvent.deferred.promise,
        cardsCountEvent.deferred.promise,
        floorCardsEvent.deferred.promise,
        allPlayersEvent.deferred.promise,
      ])

      // Format user prompt with current game state
      let userPrompt = `CURRENT GAME STATE:\n\n`

      // Player's hand
      if (hand && Array.isArray(hand)) {
        userPrompt += `YOUR HAND:\n`
        hand.forEach((card: Card, index: number) => {
          userPrompt += `${index + 1}. ${card.value} of ${card.suit}\n`
        })
        userPrompt += `\n`
      }

      // Floor card
      if (floorCards && Array.isArray(floorCards) && floorCards.length > 0) {
        const floorCard = floorCards[0]
        userPrompt += `FLOOR CARD: ${floorCard.value} of ${floorCard.suit}\n\n`
      }

      // Remaining cards
      if (remainingCards !== undefined) {
        userPrompt += `REMAINING CARDS IN DECK: ${remainingCards}\n\n`
      }

      // Score information
      if (scoreData) {
        userPrompt += `SCORE INFORMATION:\n${JSON.stringify(scoreData, null, 2)}\n\n`
      }

      // Other players
      if (allPlayers && Array.isArray(allPlayers)) {
        userPrompt += `OTHER PLAYERS:\n`
        allPlayers.forEach((player: Player) => {
          if (player.id !== playerId) {
            userPrompt += `- ${player.name}: Score ${player.score}, `
            userPrompt += `Declared Suit: ${player.declaredSuit || 'None'}, `
            userPrompt += `Cards in hand: ${player.hand?.length || 0}\n`
          }
        })
        userPrompt += `\n`
      }

      userPrompt += `What is your decision?`

      return userPrompt
    } catch (error) {
      if (LOG_GENERAL) {
        console.error(prefix, '[GetUserPrompt] Error gathering game state:', error)
      }
      return `CURRENT GAME STATE:\nUnable to retrieve full game state. Please make a decision based on available information.`
    }
  }

  /**
   * Get complete AI instructions (system message + user prompt)
   * @param gameMode - The game mode instance
   * @param playerId - The player ID
   * @returns Promise resolving to object with systemMessage and userPrompt
   */
  async GetAIInstructions(
    gameMode: GameMode,
    playerId: string
  ): Promise<{ systemMessage: string; userPrompt: string }> {
    const systemMessage = this.GetSystemMessage(gameMode)
    const userPrompt = await this.GetUserPrompt(playerId)

    return {
      systemMessage,
      userPrompt,
    }
  }
}

