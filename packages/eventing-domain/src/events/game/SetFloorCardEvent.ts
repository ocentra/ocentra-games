import { EventArgsBase } from '@/core/EventArgsBase'
import type { Card } from '@/types/game';

export class SetFloorCardEvent<TCard extends Card = Card> extends EventArgsBase {
  static readonly eventType = 'Game/SetFloorCard'

  readonly card: TCard
  readonly faceUp: boolean

  constructor(card: TCard, faceUp: boolean) {
    super()
    this.card = card
    this.faceUp = faceUp
  }
}

