import { EventArgsBase } from '@/core/EventArgsBase'

export class UpdateWildCardsHighlightEvent extends EventArgsBase {
  static readonly eventType = 'Game/UpdateWildCardsHighlight'

  readonly cardIds: string[]
  readonly highlight: boolean

  constructor(cardIds: string[], highlight: boolean) {
    super()
    this.cardIds = cardIds
    this.highlight = highlight
  }
}

