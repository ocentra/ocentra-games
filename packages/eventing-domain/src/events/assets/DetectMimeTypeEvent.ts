import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class DetectMimeTypeEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/DetectMimeType';

  readonly filePath: string;
  readonly deferred: OperationDeferred<string>;

  constructor(filePath: string, deferred: OperationDeferred<string> = new OperationDeferred<string>()) {
    super();
    this.filePath = filePath;
    this.deferred = deferred;
  }
}

