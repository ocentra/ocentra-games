import { EventArgsBase } from '@/core/EventArgsBase';
import type { ImageHash } from '@ocentra/boundary-domain/types/asset-identifiers';
import type { ImageVariant } from '@/types/app-stubs';

export interface ImageBatchResult {
  hash: ImageHash;
  variant: ImageVariant;
  blobUrl: string | null;
  source: 'memory' | 'indexeddb' | 'network' | null;
  error: string | null;
}

export class ImageBatchLoadedEvent extends EventArgsBase {
  static readonly eventType = 'Image/BatchLoaded';

  readonly results: ImageBatchResult[];
  readonly subscriberId: string;

  constructor(results: ImageBatchResult[], subscriberId: string) {
    super();
    this.results = results;
    this.subscriberId = subscriberId;
    this.isRePublishable = true;
  }
}

