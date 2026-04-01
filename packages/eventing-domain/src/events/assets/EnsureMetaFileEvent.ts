import { EventArgsBase } from '@/core/EventArgsBase';
import type { OperationDeferred } from '@/core/OperationDeferred';

export class EnsureMetaFileEvent extends EventArgsBase {
  static readonly eventType = 'Assets/EnsureMetaFile';

  readonly guid: string;
  readonly assetType: string | undefined;
  readonly deferred: OperationDeferred<string | null>;

  constructor(
    guid: string,
    assetType: string | undefined,
    deferred: OperationDeferred<string | null>
  ) {
    super();
    this.guid = guid;
    this.assetType = assetType;
    this.deferred = deferred;
  }
}

