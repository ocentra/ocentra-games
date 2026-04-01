import { EventArgsBase } from '@/core/EventArgsBase';
import type { ImageHash } from '@ocentra/boundary-domain/types/asset-identifiers';
import type { ImageVariant } from '@/types/app-stubs';

export class ImageLoadFailedEvent extends EventArgsBase {
  static readonly eventType = 'Image/LoadFailed';

  readonly hash: ImageHash;
  readonly variant: ImageVariant;
  readonly error: string;
  readonly canRetry: boolean;

  constructor(hash: ImageHash, variant: ImageVariant, error: string, canRetry: boolean = true) {
    super();
    this.hash = hash;
    this.variant = variant;
    this.error = error;
    this.canRetry = canRetry;
    this.isRePublishable = true;
  }
}

