import { EventArgsBase } from '@/core/EventArgsBase'
import type { Player } from '@/types/game'

export class ComputerPlayerTurnEvent extends EventArgsBase {
  static readonly eventType = 'Game/PlayerDecision/ComputerPlayerTurn'

  readonly currentPlayer: Player
  readonly currentBet: number

  constructor(currentPlayer: Player, currentBet: number) {
    super()
    this.currentPlayer = currentPlayer
    this.currentBet = currentBet
  }
}

