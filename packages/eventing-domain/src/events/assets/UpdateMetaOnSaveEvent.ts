import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class UpdateMetaOnSaveEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/UpdateMetaOnSave';

  readonly guid: string;
  readonly checksum?: string;
  readonly fileSize?: number;
  readonly deferred: OperationDeferred<void>;

  constructor(guid: string, deferred: OperationDeferred<void> = new OperationDeferred<void>(), checksum?: string, fileSize?: number) {
    super();
    this.guid = guid;
    this.checksum = checksum;
    this.fileSize = fileSize;
    this.deferred = deferred;
  }
}

