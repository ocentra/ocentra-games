import { EventArgsBase } from '@/core/EventArgsBase';
import type { ImageHash } from '@ocentra/boundary-domain/types/asset-identifiers';
import type { ImageVariant } from '@/types/app-stubs';

export class ImageLoadedEvent extends EventArgsBase {
  static readonly eventType = 'Image/Loaded';

  readonly hash: ImageHash;
  readonly variant: ImageVariant;
  readonly blobUrl: string;
  readonly source: 'memory' | 'indexeddb' | 'network';

  constructor(hash: ImageHash, variant: ImageVariant, blobUrl: string, source: 'memory' | 'indexeddb' | 'network') {
    super();
    this.hash = hash;
    this.variant = variant;
    this.blobUrl = blobUrl;
    this.source = source;
    this.isRePublishable = true;
  }
}

