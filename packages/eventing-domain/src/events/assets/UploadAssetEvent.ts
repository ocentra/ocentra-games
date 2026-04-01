import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { AssetMetadata } from '@ocentra/boundary-domain/types/asset-metadata';

export class UploadAssetEvent extends EventArgsBase {
  static readonly eventType = 'Assets/UploadAsset';

  readonly guid: string;
  readonly content: string;
  readonly metadata: AssetMetadata;
  readonly deferred: OperationDeferred<unknown>;

  constructor(
    guid: string,
    content: string,
    metadata: AssetMetadata,
    deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()
  ) {
    super();
    this.guid = guid;
    this.content = content;
    this.metadata = metadata;
    this.deferred = deferred;
  }
}

