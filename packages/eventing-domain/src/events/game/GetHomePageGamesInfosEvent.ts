import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export interface HomePageGamesInfosResponse {
  featured: unknown[];
  recommended: unknown[];
  comingSoon: unknown[];
  availableNow: unknown[];
}

export class GetHomePageGamesInfosEvent<T = unknown> extends EventArgsBase {
  static readonly eventType = 'Game/GetHomePageGamesInfos';

  readonly deferred: OperationDeferred<T>;

  constructor(deferred: OperationDeferred<T>) {
    super();
    this.deferred = deferred;
  }
}

