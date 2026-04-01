import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class SetCloudLastModifiedEvent extends EventArgsBase {
  static readonly eventType = 'Assets/SetCloudLastModified';

  readonly deferred: OperationDeferred<boolean>;
  readonly guid: string;
  readonly cloudTimestamp: string;

  constructor(
    guid: string,
    cloudTimestamp: string,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super();
    this.guid = guid;
    this.cloudTimestamp = cloudTimestamp;
    this.deferred = deferred;
  }
}

