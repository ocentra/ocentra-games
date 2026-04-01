import { EventArgsBase } from '@/core/EventArgsBase';
import type { ImageHash } from '@ocentra/boundary-domain/types/asset-identifiers';

export class ImageUnsubscribeEvent extends EventArgsBase {
  static readonly eventType = 'Image/Unsubscribe';

  readonly hash: ImageHash;
  readonly subscriberId: string;

  constructor(hash: ImageHash, subscriberId: string) {
    super();
    this.hash = hash;
    this.subscriberId = subscriberId;
    this.isRePublishable = true;
  }
}

