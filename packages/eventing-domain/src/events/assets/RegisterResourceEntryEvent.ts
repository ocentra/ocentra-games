import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class RegisterIResourceEntryEvent extends EventArgsBase {
  static readonly eventType = 'Assets/RegisterIResourceEntry';

  readonly deferred: OperationDeferred<boolean>;
  readonly entry: IResourceEntry;

  constructor(
    entry: IResourceEntry,
    deferred?: OperationDeferred<boolean>
  ) {
    super();
    this.entry = entry;
    this.deferred = deferred || new OperationDeferred<boolean>();
  }
}

