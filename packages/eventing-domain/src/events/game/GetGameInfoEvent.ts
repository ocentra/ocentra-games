import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { GameId, AssetGUIDType } from '@ocentra/boundary-domain/types/asset-identifiers';

export class GetGameInfoEvent extends EventArgsBase {
  static readonly eventType = 'Game/GetGameInfo';

  readonly deferred: OperationDeferred<unknown>;
  readonly gameId: GameId | AssetGUIDType | string;

  constructor(
    gameId: GameId | AssetGUIDType | string,
    deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()
  ) {
    super();
    this.gameId = gameId;
    this.deferred = deferred;
  }
}

