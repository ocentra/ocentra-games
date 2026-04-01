import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class RegisterGuidEvent extends EventArgsBase {
  static readonly eventType = 'Assets/RegisterGuid';

  readonly deferred: OperationDeferred<boolean>;
  readonly guid: string;
  readonly type?: string;
  readonly displayName?: string;
  readonly gameId?: string | null;
  readonly category?: string;
  readonly path?: string;
  readonly variant?: string;

  constructor(
    guid: string,
    deferred?: OperationDeferred<boolean>,
    type?: string,
    displayName?: string,
    gameId?: string | null,
    category?: string,
    path?: string,
    variant?: string
  ) {
    super();
    this.guid = guid;
    this.deferred = deferred || new OperationDeferred<boolean>();
    this.type = type;
    this.displayName = displayName;
    this.gameId = gameId;
    this.category = category;
    this.path = path;
    this.variant = variant;
  }
}

