import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestGetInferenceSettingsEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestGetInferenceSettings';

  readonly deferred: OperationDeferred<Record<string, unknown> | null>;

  constructor(deferred: OperationDeferred<Record<string, unknown> | null>) {
    super();
    this.deferred = deferred;
  }
}
