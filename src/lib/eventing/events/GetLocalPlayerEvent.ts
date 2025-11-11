import { EventArgsBase } from '@lib/eventing/base/EventArgsBase';
import type { OperationDeferred } from '@lib/eventing';
import type { PlayerProfile } from './PlayerTypes';

export class GetLocalPlayerEvent extends EventArgsBase {
  static readonly eventType = 'GetLocalPlayerEvent';

  public readonly deferred: OperationDeferred<PlayerProfile>;

  constructor(deferred: OperationDeferred<PlayerProfile>) {
    super();
    this.deferred = deferred;
  }
}

