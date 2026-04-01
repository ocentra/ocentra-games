import type { Env } from '@/constants/env';
import { HASH_REGEX } from './constants';
import { computeSha256Hex } from '@/utils/crypto-utils';
import { extractGuidFromAsset, inferContentType } from './content-helpers';
import { readEntryIndex } from './entry-index-loader';

export interface UploadFileLike {
  name: string;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function decodeBase64Content(content: string): Uint8Array {
  const commaIndex = content.indexOf(',');
  const payload = commaIndex >= 0 ? content.slice(commaIndex + 1) : content;
  const binary = atob(payload);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function keyCandidatesForHash(hash: string): string[] {
  const normalized = hash.toLowerCase();
  return [normalized, `images/${normalized}`];
}

async function getR2KeyFromIndex(
  env: Env,
  predicate: (resource: { guid?: string; hash?: string; checksum?: string; path: string }) => boolean
): Promise<string | null> {
  const entryIndex = await readEntryIndex(env);
  if (!entryIndex) return null;
  const match = entryIndex.resources.find((resource) => predicate(resource));
  if (!match?.path) return null;
  return match.path.replace(/^Resources\//, '');
}

async function getObjectByIndexedPath(
  env: Env,
  predicate: (resource: { guid?: string; hash?: string; checksum?: string; path: string }) => boolean
): Promise<R2ObjectBody | null> {
  const r2Key = await getR2KeyFromIndex(env, predicate);
  if (!r2Key) return null;
  return env.ASSETS_BUCKET!.get(r2Key);
}

export async function resolveAssetR2Key(
  env: Env,
  request: { guid?: string | null; hash?: string | null; checksum?: string | null }
): Promise<string | null> {
  if (!env.ASSETS_BUCKET) return null;
  if (request.guid) {
    const headResult = await env.ASSETS_BUCKET.head(request.guid);
    if (headResult) return request.guid;
    return getR2KeyFromIndex(env, (resource) => resource.guid === request.guid);
  }
  if (request.hash) {
    for (const key of keyCandidatesForHash(request.hash)) {
      const headResult = await env.ASSETS_BUCKET.head(key);
      if (headResult) return key;
    }
    return getR2KeyFromIndex(
      env,
      (resource) => resource.hash === request.hash || resource.checksum === request.hash
    );
  }
  if (request.checksum) {
    const headResult = await env.ASSETS_BUCKET.head(request.checksum);
    if (headResult) return request.checksum;
    return getR2KeyFromIndex(env, (resource) => resource.checksum === request.checksum);
  }
  return null;
}

export async function resolveAssetR2KeyFromPathParam(env: Env, key: string): Promise<string | null> {
  if (!env.ASSETS_BUCKET) return null;
  if (key.includes('/')) {
    const headResult = await env.ASSETS_BUCKET.head(key);
    return headResult ? key : null;
  }
  return resolveAssetR2Key(env, HASH_REGEX.test(key) ? { hash: key } : { guid: key });
}

export async function getAssetByIdentifier(
  env: Env,
  request: { guid?: string | null; hash?: string | null; checksum?: string | null }
): Promise<R2ObjectBody | null> {
  if (request.guid) {
    const byKey = await env.ASSETS_BUCKET!.get(request.guid);
    if (byKey) return byKey;
    return getObjectByIndexedPath(env, (resource) => resource.guid === request.guid);
  }
  if (request.hash) {
    const candidates = keyCandidatesForHash(request.hash);
    for (const key of candidates) {
      const object = await env.ASSETS_BUCKET!.get(key);
      if (object) return object;
    }
    return getObjectByIndexedPath(
      env,
      (resource) => resource.hash === request.hash || resource.checksum === request.hash
    );
  }
  if (request.checksum) {
    const byChecksum = await env.ASSETS_BUCKET!.get(request.checksum);
    if (byChecksum) return byChecksum;
    return getObjectByIndexedPath(env, (resource) => resource.checksum === request.checksum);
  }
  return null;
}

export async function getAssetByRawKey(env: Env, key: string): Promise<R2ObjectBody | null> {
  return env.ASSETS_BUCKET!.get(key);
}

export async function putAssetByKey(
  env: Env,
  key: string,
  body: ArrayBuffer,
  contentType?: string | null
): Promise<{ key: string; size: number }> {
  await env.ASSETS_BUCKET!.put(key, body, {
    httpMetadata: {
      contentType: contentType || inferContentType(key),
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  return { key, size: body.byteLength };
}

export async function deleteAssetByKey(env: Env, key: string): Promise<void> {
  await env.ASSETS_BUCKET!.delete(key);
}

export async function uploadImageContent(
  env: Env,
  image: { hash: string; content: string; contentType?: string | null }
): Promise<{ hash: string; key: string }> {
  const bytes = decodeBase64Content(image.content);
  const computedHash = await computeSha256Hex(bytes);
  const expectedHash = image.hash.toLowerCase();
  if (HASH_REGEX.test(expectedHash) && expectedHash !== computedHash) {
    throw new Error(`Hash mismatch for upload image. expected=${expectedHash} actual=${computedHash}`);
  }
  const key = `images/${computedHash}`;
  await env.ASSETS_BUCKET!.put(key, bytes, {
    httpMetadata: {
      contentType: image.contentType || 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  return { hash: computedHash, key };
}

export async function uploadBatchFiles(
  env: Env,
  files: UploadFileLike[]
): Promise<Array<{ key: string; size: number; originalName: string }>> {
  const uploaded: Array<{ key: string; size: number; originalName: string }> = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const fallbackKey = await computeSha256Hex(bytes);
    const fileName = file.name || fallbackKey;
    const isAsset = fileName.toLowerCase().endsWith('.asset');

    let key = fallbackKey;
    if (isAsset) {
      const content = new TextDecoder().decode(bytes);
      key = extractGuidFromAsset(content) ?? fallbackKey;
    }

    await env.ASSETS_BUCKET!.put(key, bytes, {
      httpMetadata: {
        contentType: file.type || inferContentType(fileName),
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    uploaded.push({ key, size: bytes.byteLength, originalName: fileName });
  }
  return uploaded;
}

function extractR2ContentMd5Hex(object: R2Object): string | undefined {
  try {
    const json = object.checksums.toJSON();
    const md5 = json.md5;
    if (typeof md5 === 'string' && /^[0-9a-f]{32}$/i.test(md5)) {
      return md5.toLowerCase();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function listAssets(
  env: Env,
  prefix?: string | null
): Promise<Array<{ key: string; etag: string; size: number; md5?: string }>> {
  const objects: Array<{ key: string; etag: string; size: number; md5?: string }> = [];
  let cursor: string | undefined;

  do {
    const listed = await env.ASSETS_BUCKET!.list({
      prefix: prefix || undefined,
      cursor,
      limit: 1000,
    });

    objects.push(
      ...listed.objects.map((object) => {
        const md5 = extractR2ContentMd5Hex(object);
        return md5
          ? { key: object.key, etag: object.etag, size: object.size, md5 }
          : { key: object.key, etag: object.etag, size: object.size };
      })
    );

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return objects;
}
