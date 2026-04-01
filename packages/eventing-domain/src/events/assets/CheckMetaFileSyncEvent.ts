import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export interface MetaFileSyncStatus {
  isStale: boolean;
  assetChecksum: string | null;
  metaChecksum: string | null;
}

export class CheckMetaFileSyncEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/CheckMetaFileSync';

  readonly assetPath: string;
  readonly deferred: OperationDeferred<MetaFileSyncStatus>;

  constructor(assetPath: string, deferred: OperationDeferred<MetaFileSyncStatus> = new OperationDeferred<MetaFileSyncStatus>()) {
    super();
    this.assetPath = assetPath;
    this.deferred = deferred;
  }
}

