import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class GetResourceByHashEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetResourceByHash';

  readonly deferred: OperationDeferred<IResourceEntry | null>;
  readonly hash: string;

  constructor(
    hash: string,
    deferred?: OperationDeferred<IResourceEntry | null>
  ) {
    super();
    this.hash = hash;
    this.deferred = deferred || new OperationDeferred<IResourceEntry | null>();
  }
}

