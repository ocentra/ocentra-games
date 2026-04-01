import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { GuidValidationResult } from '@/types/meta';

export class ValidateAllMetaEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/ValidateAllMeta';

  readonly deferred: OperationDeferred<GuidValidationResult>;

  constructor(deferred: OperationDeferred<GuidValidationResult> = new OperationDeferred<GuidValidationResult>()) {
    super();
    this.deferred = deferred;
  }
}

