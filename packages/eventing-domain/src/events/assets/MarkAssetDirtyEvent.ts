import { EventArgsBase } from '@/core/EventArgsBase';

export class MarkAssetDirtyEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/MarkAssetDirty';

  readonly guid: string;

  constructor(guid: string) {
    super();
    this.guid = guid;
  }
}

