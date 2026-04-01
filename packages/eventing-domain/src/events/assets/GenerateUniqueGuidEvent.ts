import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GenerateUniqueGuidEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GenerateUniqueGuid';

  readonly deferred: OperationDeferred<string>;

  constructor(deferred: OperationDeferred<string> = new OperationDeferred<string>()) {
    super();
    this.deferred = deferred;
  }
}

