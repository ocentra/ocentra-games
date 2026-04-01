import { EventArgsBase } from '@/core/EventArgsBase';
import type { ImageVariant } from '@/types/app-stubs';
import type { ImageHash } from '@ocentra/boundary-domain/types/asset-identifiers';

export const ImageLoadPriority = {
  HIGH: 100,
  MEDIUM: 50,
  LOW: 10,
} as const;

export type ImageLoadPriority = typeof ImageLoadPriority[keyof typeof ImageLoadPriority];

export interface ImageBatchRequestItem {
  hash: ImageHash;
  variant: ImageVariant;
  priority: ImageLoadPriority;
}

export class ImageBatchLoadRequestEvent extends EventArgsBase {
  static readonly eventType = 'Image/BatchLoadRequest';

  readonly requests: ImageBatchRequestItem[];
  readonly subscriberId: string;
  readonly replaceExisting?: boolean;

  constructor(requests: ImageBatchRequestItem[], subscriberId: string, replaceExisting?: boolean) {
    super();
    this.requests = requests;
    this.subscriberId = subscriberId;
    this.replaceExisting = replaceExisting;
    this.isRePublishable = true;
  }
}

