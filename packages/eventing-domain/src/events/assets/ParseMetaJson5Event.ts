import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { MetaData } from '@/types/meta';

export class ParseMetaJson5Event extends EventArgsBase {
  static readonly eventType = 'MetaFile/ParseMetaJson5';

  readonly json5Content: string;
  readonly deferred: OperationDeferred<MetaData>;

  constructor(json5Content: string, deferred: OperationDeferred<MetaData> = new OperationDeferred<MetaData>()) {
    super();
    this.json5Content = json5Content;
    this.deferred = deferred;
  }
}


