export const ImageVariant = {
  Icon: 'icon',
  Full: 'full',
} as const;

export type ImageVariant = (typeof ImageVariant)[keyof typeof ImageVariant];

export const ProcessingState = {
  NotProcessed: 'not_processed',
  Processing: 'processing',
  Processed: 'processed',
} as const;

export type ProcessingState = (typeof ProcessingState)[keyof typeof ProcessingState];

export interface CachedImage {
  id: string;
  variant: ImageVariant;
  blob: Blob;
  etag?: string;
  hash: string;
  cachedAt: number;
  size: number;
  contentType: string;
  processingState: ProcessingState;
  path?: string;
}
