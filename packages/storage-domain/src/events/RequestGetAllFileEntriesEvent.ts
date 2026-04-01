import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export interface FileEntryInfo {
  url: string;
  size: number;
}

export class RequestGetAllFileEntriesEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestGetAllFileEntries';

  readonly deferred: OperationDeferred<FileEntryInfo[]>;

  constructor(deferred: OperationDeferred<FileEntryInfo[]>) {
    super();
    this.deferred = deferred;
  }
}
