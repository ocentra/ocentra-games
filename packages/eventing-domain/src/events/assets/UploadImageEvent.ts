import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class UploadImageEvent extends EventArgsBase {
  static readonly eventType = 'Assets/UploadImage';

  readonly hash: string;
  readonly content: string;
  readonly deferred: OperationDeferred<{ path: string }>;

  constructor(
    hash: string,
    content: string,
    deferred: OperationDeferred<{ path: string }> = new OperationDeferred<{ path: string }>()
  ) {
    super();
    this.hash = hash;
    this.content = content;
    this.deferred = deferred;
  }
}

