import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestSaveChunkEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestSaveChunk';

  readonly repo: string;
  readonly path: string;
  readonly blob: Blob;
  readonly onUpdate?: () => void;
  readonly deferred: OperationDeferred<void>;

  constructor(
    repo: string,
    path: string,
    blob: Blob,
    deferred: OperationDeferred<void>,
    onUpdate?: () => void
  ) {
    super();
    this.repo = repo;
    this.path = path;
    this.blob = blob;
    this.deferred = deferred;
    this.onUpdate = onUpdate;
  }
}
