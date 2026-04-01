import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetAssetTypeInfoEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetAssetTypeInfo';

  readonly deferred: OperationDeferred<unknown>;
  readonly assetType: string;

  constructor(
    assetType: string,
    deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()
  ) {
    super();
    this.assetType = assetType;
    this.deferred = deferred;
  }
}

