import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestAddQuantToManifestEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestAddQuantToManifest';

  readonly repo: string;
  readonly quantPath: string;
  readonly status: string;
  readonly files?: string[];
  readonly deferred: OperationDeferred<void>;

  constructor(
    repo: string,
    quantPath: string,
    status: string,
    deferred: OperationDeferred<void>,
    files?: string[]
  ) {
    super();
    this.repo = repo;
    this.quantPath = quantPath;
    this.status = status;
    this.deferred = deferred;
    this.files = files;
  }
}
