import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetImagesByGameIdEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetImagesByGameId';

  readonly gameId: string;
  readonly deferred: OperationDeferred<Set<string>>;

  constructor(gameId: string, deferred: OperationDeferred<Set<string>> = new OperationDeferred<Set<string>>()) {
    super();
    this.gameId = gameId;
    this.deferred = deferred;
  }
}

