import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { GameMode } from '@/types/app-stubs';
import type { AssetGUID } from '@/types/app-stubs';

export class GetGameModeEvent extends EventArgsBase {
  static readonly eventType = 'Game/GetGameMode';

  readonly deferred: OperationDeferred<unknown>;
  readonly idOrClassOrGuid: string | (new () => GameMode) | AssetGUID;

  constructor(
    idOrClassOrGuid: string | (new () => GameMode) | AssetGUID,
    deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()
  ) {
    super();
    this.idOrClassOrGuid = idOrClassOrGuid;
    this.deferred = deferred;
  }
}

