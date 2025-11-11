import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import { createOperationDeferred, type OperationDeferred } from '@lib/eventing'
import type { AdditionalUserInfo } from '@types/auth'

export class RequestAdditionalUserInfoEvent extends EventArgsBase {
  static readonly eventType = 'Authentication/RequestAdditionalUserInfo'

  readonly isGuest: boolean
  readonly deferred: OperationDeferred<AdditionalUserInfo>

  constructor(
    isGuest: boolean,
    deferred: OperationDeferred<AdditionalUserInfo> = createOperationDeferred<AdditionalUserInfo>()
  ) {
    super()
    this.isGuest = isGuest
    this.deferred = deferred
  }
}

