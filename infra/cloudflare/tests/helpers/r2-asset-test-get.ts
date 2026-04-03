import type { R2Bucket } from '@cloudflare/workers-types';

async function assetsBucket(): Promise<R2Bucket | undefined> {
  try {
    const { env } = await import('cloudflare:test');
    return env.ASSETS_BUCKET as R2Bucket | undefined;
  } catch {
    return undefined;
  }
}

export async function getTestAssetsBucketArrayBuffer(storageKey: string): Promise<ArrayBuffer | null> {
  const bucket = await assetsBucket();
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
  const bucket = await assetsBucket();
  if (!bucket) {
    return null;
  }
  const object = await bucket.get(storageKey);
  if (!object) {
    return null;
  }
  return object.text();
}
