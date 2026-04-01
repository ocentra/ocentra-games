import { EventArgsBase } from '@/core/EventArgsBase'
import type { ScoreManagerDetails } from '@/types/game-events'

export class UpdateScoreDataEvent<TDetails extends ScoreManagerDetails = ScoreManagerDetails> extends EventArgsBase {
  static readonly eventType = 'Game/UpdateScoreData'

  readonly details: TDetails

  constructor(details: TDetails) {
    super()
    this.details = details
  }
}

