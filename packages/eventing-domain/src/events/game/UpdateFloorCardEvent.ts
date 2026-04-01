import { EventArgsBase } from '@/core/EventArgsBase'
import type { Card } from '@/types/game';

export class UpdateFloorCardEvent<TCard extends Card = Card> extends EventArgsBase {
  static readonly eventType = 'Game/UpdateFloorCard'

  readonly card: TCard

  constructor(card: TCard) {
    super()
    this.card = card
  }
}

