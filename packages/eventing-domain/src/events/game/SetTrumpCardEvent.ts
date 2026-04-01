import { EventArgsBase } from '@/core/EventArgsBase'
import type { Card } from '@/types/game';

export class SetTrumpCardEvent<TCard extends Card = Card> extends EventArgsBase {
  static readonly eventType = 'Game/SetTrumpCard'

  readonly card: TCard | null

  constructor(card: TCard | null) {
    super()
    this.card = card
  }
}

