import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestSaveInferenceSettingsEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestSaveInferenceSettings';

  readonly settings: Record<string, unknown>;
  readonly deferred: OperationDeferred<void>;

  constructor(settings: Record<string, unknown>, deferred: OperationDeferred<void>) {
    super();
    this.settings = settings;
    this.deferred = deferred;
  }
}
