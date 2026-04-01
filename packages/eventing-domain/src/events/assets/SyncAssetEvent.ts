import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class SyncAssetEvent extends EventArgsBase {
  static readonly eventType = 'Assets/SyncAsset';

  readonly assetPath: string;
  readonly deferred: OperationDeferred<void>;

  constructor(
    assetPath: string,
    deferred: OperationDeferred<void> = new OperationDeferred<void>()
  ) {
    super();
    this.assetPath = assetPath;
    this.deferred = deferred;
  }
}

