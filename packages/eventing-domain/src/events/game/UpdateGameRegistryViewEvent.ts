import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { IAssetResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class UpdateGameRegistryViewEvent extends EventArgsBase {
  static readonly eventType = 'Game/UpdateGameRegistryView';

  readonly gameModeEntries: IAssetResourceEntry[];
  readonly deferred: OperationDeferred<boolean>;

  constructor(
    gameModeEntries: IAssetResourceEntry[],
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super();
    this.gameModeEntries = gameModeEntries;
    this.deferred = deferred;
  }
}

