import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export interface SyncMetadata {
  lastSyncFromCloud: string | null;
  lastSyncToCloud: string | null;
  totalAssets: number;
}

export class GetSyncMetadataEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetSyncMetadata';

  readonly deferred: OperationDeferred<SyncMetadata>;

  constructor(deferred: OperationDeferred<SyncMetadata> = new OperationDeferred<SyncMetadata>()) {
    super();
    this.deferred = deferred;
  }
}

