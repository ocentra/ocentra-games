import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class CreateAssetTemplateEvent extends EventArgsBase {
  static readonly eventType = 'Assets/CreateAssetTemplate';

  readonly deferred: OperationDeferred<Record<string, unknown> | null>;
  readonly assetType: string;

  constructor(
    assetType: string,
    deferred: OperationDeferred<Record<string, unknown> | null> = new OperationDeferred<Record<string, unknown> | null>()
  ) {
    super();
    this.assetType = assetType;
    this.deferred = deferred;
  }
}

