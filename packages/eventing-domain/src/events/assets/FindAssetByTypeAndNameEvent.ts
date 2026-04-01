import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class FindAssetByTypeAndNameEvent extends EventArgsBase {
  static readonly eventType = 'Assets/FindAssetByTypeAndName';

  readonly deferred: OperationDeferred<IResourceEntry | null>;
  readonly assetType: string;
  readonly displayName?: string;
  readonly variant?: string;

  constructor(
    assetType: string,
    displayNameOrVariant?: string,
    deferred?: OperationDeferred<IResourceEntry | null>,
    variant?: string
  ) {
    super();
    this.assetType = assetType;
    this.deferred = deferred || new OperationDeferred<IResourceEntry | null>();
    
    if (variant) {
      this.variant = variant;
      this.displayName = displayNameOrVariant;
    } else {
      this.displayName = displayNameOrVariant;
    }
  }
}

