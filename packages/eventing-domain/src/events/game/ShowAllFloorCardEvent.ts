import { EventArgsBase } from '@/core/EventArgsBase'

export class ShowAllFloorCardEvent extends EventArgsBase {
  static readonly eventType = 'Game/ShowAllFloorCard'

  constructor() {
    super()
  }
}

