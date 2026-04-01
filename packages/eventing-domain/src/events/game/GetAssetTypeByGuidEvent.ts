import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetAssetTypeByGuidEvent extends EventArgsBase {
  static readonly eventType = 'Game/GetAssetTypeByGuid';

  readonly deferred: OperationDeferred<string | null>;
  readonly guid: string;

  constructor(
    guid: string,
    deferred: OperationDeferred<string | null> = new OperationDeferred<string | null>()
  ) {
    super();
    this.guid = guid;
    this.deferred = deferred;
  }
}

