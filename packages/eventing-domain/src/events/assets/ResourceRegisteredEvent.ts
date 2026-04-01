import { EventArgsBase } from '@/core/EventArgsBase';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class ResourceRegisteredEvent extends EventArgsBase {
  static readonly eventType = 'Assets/ResourceRegistered';

  readonly entry: IResourceEntry;

  constructor(entry: IResourceEntry) {
    super();
    this.entry = entry;
  }
}

