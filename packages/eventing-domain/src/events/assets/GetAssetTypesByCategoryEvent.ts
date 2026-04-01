import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { AssetCategory } from '@ocentra/boundary-domain/types/asset-category';

export class GetAssetTypesByCategoryEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetAssetTypesByCategory';

  readonly deferred: OperationDeferred<unknown>;
  readonly category: AssetCategory;

  constructor(
    category: AssetCategory,
    deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()
  ) {
    super();
    this.category = category;
    this.deferred = deferred;
  }
}

