import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class ReplaceAllResourcesEvent extends EventArgsBase {
  static readonly eventType = 'Assets/ReplaceAllResources';

  readonly entries: IResourceEntry[];
  readonly deferred: OperationDeferred<boolean>;

  constructor(
    entries: IResourceEntry[],
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super();
    this.entries = entries;
    this.deferred = deferred;
  }
}

