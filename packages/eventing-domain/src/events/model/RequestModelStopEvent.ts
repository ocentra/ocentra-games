import { EventArgsBase } from '@/core/EventArgsBase'

export class RequestModelStopEvent extends EventArgsBase {
  static readonly eventType = 'Model/RequestModelStop'

  constructor() {
    super()
  }
}

