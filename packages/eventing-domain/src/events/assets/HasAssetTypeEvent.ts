import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class HasAssetTypeEvent extends EventArgsBase {
  static readonly eventType = 'Assets/HasAssetType';

  readonly deferred: OperationDeferred<boolean>;
  readonly assetType: string;

  constructor(
    assetType: string,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super();
    this.assetType = assetType;
    this.deferred = deferred;
  }
}

