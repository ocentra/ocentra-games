import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { NetworkRouterHandlerMarker } from '@/interfaces/IEventHandler';

export class GetGameTemplateEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetGameTemplate';

  readonly gameId: string;
  readonly category: string;
  readonly deferred: OperationDeferred<Record<string, unknown>>;

  constructor(
    gameId: string,
    category: string,
    deferred: OperationDeferred<Record<string, unknown>> = new OperationDeferred<Record<string, unknown>>(),
    targetHandler?: typeof NetworkRouterHandlerMarker
  ) {
    super(targetHandler);
    this.gameId = gameId;
    this.category = category;
    this.deferred = deferred;
  }
}

