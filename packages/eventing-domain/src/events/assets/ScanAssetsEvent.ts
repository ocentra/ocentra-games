import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { ScanOptions } from '@/types/app-stubs';

export class ScanAssetsEvent extends EventArgsBase {
  static readonly eventType = 'Assets/ScanAssets';

  readonly options?: ScanOptions;
  readonly deferred: OperationDeferred<unknown>;

  constructor(
    options: ScanOptions | undefined,
    deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()
  ) {
    super();
    this.options = options;
    this.deferred = deferred;
  }
}

