import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export type AssetClass = new () => unknown;

export class GetAssetConstructorEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetAssetConstructor';

  readonly assetType: string;
  readonly deferred: OperationDeferred<unknown>;

  constructor(assetType: string, deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()) {
    super();
    this.assetType = assetType;
    this.deferred = deferred;
  }
}

