import { EventArgsBase } from '@/core/EventArgsBase';
import { ImageVariant } from '@/types/app-stubs';
import type { MetaData } from '@/types/meta';
import type { ImageHash } from '@ocentra/boundary-domain/types/asset-identifiers';

export class ImageLoadRequestEvent extends EventArgsBase {
  static readonly eventType = 'Image/LoadRequest';

  readonly hash: ImageHash;
  readonly subscriberId: string;
  readonly priority: number;
  readonly variant: ImageVariant;
  readonly meta?: MetaData;

  constructor(hash: ImageHash, subscriberId: string, priority: number = 0, variant: ImageVariant = ImageVariant.Full, meta?: MetaData) {
    super();
    this.hash = hash;
    this.subscriberId = subscriberId;
    this.priority = priority;
    this.variant = variant;
    this.meta = meta;
    this.isRePublishable = true;
  }
}

