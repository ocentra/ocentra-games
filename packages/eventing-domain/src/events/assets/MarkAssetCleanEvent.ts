import { EventArgsBase } from '@/core/EventArgsBase';

export class MarkAssetCleanEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/MarkAssetClean';

  readonly guid: string;

  constructor(guid: string) {
    super();
    this.guid = guid;
  }
}

