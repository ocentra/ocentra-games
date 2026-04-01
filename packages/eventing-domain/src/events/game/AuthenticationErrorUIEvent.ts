import { EventArgsBase } from '@/core/EventArgsBase'

export class AuthenticationErrorUIEvent extends EventArgsBase {
  static readonly eventType = 'Game/AuthenticationErrorUI'

  readonly message: string
  readonly delaySeconds: number

  constructor(message: string, delaySeconds = 10) {
    super()
    this.message = message
    this.delaySeconds = delaySeconds
  }
}

