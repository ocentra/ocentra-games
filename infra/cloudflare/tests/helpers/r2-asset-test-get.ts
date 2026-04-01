import type { R2Bucket } from '@cloudflare/workers-types';
import { env } from 'cloudflare:test';

function assetsBucket(): R2Bucket | undefined {
  return env.ASSETS_BUCKET as R2Bucket | undefined;
}

export async function getTestAssetsBucketArrayBuffer(storageKey: string): Promise<ArrayBuffer | null> {
  const bucket = assetsBucket();
  if (!bucket) {
    return null;
  }
  const object = await bucket.get(storageKey);
  if (!object) {
    return null;
  }
  return object.arrayBuffer();
}

export async function getTestAssetsBucketText(storageKey: string): Promise<string | null> {
  const bucket = assetsBucket();
  if (!bucket) {
    return null;
  }
  const object = await bucket.get(storageKey);
  if (!object) {
    return null;
  }
  return object.text();
}
