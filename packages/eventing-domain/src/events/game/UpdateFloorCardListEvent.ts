import { EventArgsBase } from '@/core/EventArgsBase'
import type { Card } from '@/types/game';

export class UpdateFloorCardListEvent<TCard extends Card = Card> extends EventArgsBase {
  static readonly eventType = 'Game/UpdateFloorCardList'

  readonly cards: TCard[]

  constructor(cards: TCard[]) {
    super()
    this.cards = cards
  }
}

