import { EventArgsBase } from '@/core/EventArgsBase';
import type { OperationDeferred } from '@/core/OperationDeferred';
import type { MetaData } from '@/types/meta';

export class ReadMetaFileEvent extends EventArgsBase {
  static readonly eventType = 'Assets/ReadMetaFile';

  readonly guid: string;
  readonly deferred: OperationDeferred<MetaData>;

  constructor(
    guid: string,
    deferred: OperationDeferred<MetaData>
  ) {
    super();
    this.guid = guid;
    this.deferred = deferred;
  }
}

