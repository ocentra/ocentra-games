import { EventArgsBase } from '@/core/EventArgsBase'

export class PurchaseCoinsEvent extends EventArgsBase {
  static readonly eventType = 'Game/PurchaseCoins'

  readonly amount: number

  constructor(amount: number) {
    super()
    this.amount = amount
  }
}

