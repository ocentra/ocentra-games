import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import type { ContentBlock } from '../game/gameInfo/GameInfo';
import type { SynthesisContext } from '../types/synthesis';

export class SynthesizeGameInfoEvent extends EventArgsBase {
  static readonly eventType = 'SynthesizeGameInfoEvent';

  readonly gameInfoGuid: string;
  readonly pageIndices: number[];
  readonly deferred: OperationDeferred<Map<number, ContentBlock[]>>;

  constructor(
    gameInfoGuid: string,
    pageIndices: number[],
    deferred: OperationDeferred<Map<number, ContentBlock[]>>
  ) {
    super();
    this.gameInfoGuid = gameInfoGuid;
    this.pageIndices = pageIndices;
    this.deferred = deferred;
  }
}

export class RequestAssetContentEvent extends EventArgsBase {
  static readonly eventType = 'RequestAssetContentEvent';

  readonly assetGuid: string;
  readonly context: SynthesisContext;
  readonly deferred: OperationDeferred<ContentBlock[]>;

  constructor(
    assetGuid: string,
    context: SynthesisContext,
    deferred: OperationDeferred<ContentBlock[]>
  ) {
    super();
    this.assetGuid = assetGuid;
    this.context = context;
    this.deferred = deferred;
  }
}
