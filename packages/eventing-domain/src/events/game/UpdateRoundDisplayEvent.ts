import { EventArgsBase } from '@/core/EventArgsBase'
import type { RoundRecord } from '@/types/game-events'

export class UpdateRoundDisplayEvent<TRecord = Record<string, unknown>> extends EventArgsBase {
  static readonly eventType = 'Game/UpdateRoundDisplay'

  readonly currentRound: number
  readonly totalRounds: number
  readonly records: RoundRecord<TRecord>[]

  constructor(currentRound: number, totalRounds: number, records: RoundRecord<TRecord>[] = []) {
    super()
    this.currentRound = currentRound
    this.totalRounds = totalRounds
    this.records = records
  }
}

