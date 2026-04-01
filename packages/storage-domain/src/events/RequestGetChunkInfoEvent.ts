import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import type { ChunkInfo } from '@/model-cache/types';

export class RequestGetChunkInfoEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestGetChunkInfo';

  readonly repo: string;
  readonly path: string;
  readonly deferred: OperationDeferred<ChunkInfo | null>;

  constructor(
    repo: string,
    path: string,
    deferred: OperationDeferred<ChunkInfo | null>
  ) {
    super();
    this.repo = repo;
    this.path = path;
    this.deferred = deferred;
  }
}
