import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { AdditionalUserInfo } from '@/types/auth'

export class RequestAdditionalUserInfoEvent extends EventArgsBase {
  static readonly eventType = 'Authentication/RequestAdditionalUserInfo'

  readonly isGuest: boolean
  readonly deferred: OperationDeferred<AdditionalUserInfo>

  constructor(
    isGuest: boolean,
    deferred: OperationDeferred<AdditionalUserInfo> = new OperationDeferred<AdditionalUserInfo>()
  ) {
    super()
    this.isGuest = isGuest
    this.deferred = deferred
  }
}

