import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class UpdateUIInteractabilityEvent extends EventArgsBase {
  static readonly eventType = 'Authentication/UpdateUIInteractability'

  readonly isInteractable: boolean

  constructor(isInteractable: boolean) {
    super()
    this.isInteractable = isInteractable
  }
}

