import { EventArgsBase } from '@/core/EventArgsBase';

export class ClearDirtyAssetsEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/ClearDirtyAssets';

  constructor() {
    super();
  }
}

