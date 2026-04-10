import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { validateZodBody } from '@/utils/zod-validation';
import { z } from 'zod';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import {
  putAssetByKey,
  deleteAssetByKey,
  uploadImageContent,
  uploadBatchFiles,
  listAssets,
  resolveAssetR2Key,
  resolveAssetR2KeyFromPathParam,
  type UploadFileLike,
} from '@/logic/assets/assets';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';
import type { EntryIndexDocument } from '@ocentra/game-asset-domain/schemas/entry-index-schema';
import { getEntryIndexHash, readEntryIndex } from '@/logic/assets/entry-index-loader';
import { buildScanResponseFromResources, buildSyncDiff } from '@/logic/assets/resources';
import { buildR2PresignedGetUrl, canPresignR2AssetGet } from '@/logic/assets/r2-presigned-get';

function publicBasePathForR2Key(r2Key: string): string {
  return r2Key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function getAssetPathParam(path: string): string | null {
  if (path.startsWith(ApiEndpoint.Assets.ResourcePrefix)) {
    const key = path.slice(ApiEndpoint.Assets.ResourcePrefix.length);
    return key ? decodeURIComponent(key) : null;
  }
  const base = ApiEndpoint.Assets.Base;
  if (path.startsWith(`${base}/`) && path.length > base.length + 1) {
    const suffix = path.slice(base.length + 1);
    const first = suffix.split('/')[0];
    if (first && !ApiEndpoint.Assets.ExcludeSegments.includes(first)) {
      return decodeURIComponent(suffix);
    }
  }
  return null;
}

function isAssetReadRoute(path: string): boolean {
  return path === ApiEndpoint.Assets.Base;
}

function shouldRedirectAssetReadToPublicUrl(env: Env): boolean {
  return Boolean(env.ASSETS_PUBLIC_URL?.trim());
}

function redirectResponseToPublicAsset(env: Env, r2Key: string): Response {
  const base = env.ASSETS_PUBLIC_URL!.trim().replace(/\/$/, '');
  const location = `${base}/${publicBasePathForR2Key(r2Key)}`;
  return new Response(null, {
    status: HttpStatus.Found,
    headers: {
      [HttpHeader.Location]: location,
      ...getCorsHeaders(env),
    },
  });
}

function jsonResponse(
  env: Env,
  data: unknown,
  status: number
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env),
    },
  });
}

export async function handleAssetsRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  if (!env.ASSETS_BUCKET) {
    return jsonResponse(env, { error: ErrorMessage.AssetsNotConfigured }, HttpStatus.ServiceUnavailable);
  }

  if (path === ApiEndpoint.Resources.Base) {
    return jsonResponse(env, { error: ErrorMessage.LegacyResourcesDisabled }, HttpStatus.NotFound);
  }

  const url = new URL(request.url);

  if (path === ApiEndpoint.Assets.DownloadUrl && request.method === HttpMethod.Get) {
    const guid = url.searchParams.get('guid');
    const hash = url.searchParams.get('hash');
    const checksum = url.searchParams.get('checksum');
    const identifierCount = [guid, hash, checksum].filter((value) => value !== null && value !== '').length;
    if (identifierCount !== 1) {
      return jsonResponse(
        env,
        { error: ErrorMessage.BadRequest, message: 'Exactly one of guid, hash, or checksum is required' },
        HttpStatus.BadRequest
      );
    }
    const r2Key = await resolveAssetR2Key(env, { guid, hash, checksum });
    if (!r2Key) {
      return jsonResponse(env, { error: ErrorMessage.AssetNotFound }, HttpStatus.NotFound);
    }

    const isLocalDev = env.ENVIRONMENT === Environment.Development && env.TEST_MODE === 'true';
    const hasPublicUrl = Boolean(env.ASSETS_PUBLIC_URL?.trim());

    if (shouldRedirectAssetReadToPublicUrl(env)) {
      const base = env.ASSETS_PUBLIC_URL!.trim().replace(/\/$/, '');
      return jsonResponse(
        env,
        { url: `${base}/${publicBasePathForR2Key(r2Key)}`, delivery: 'public' as const },
        HttpStatus.Ok
      );
    }

    if (isLocalDev && !hasPublicUrl) {
      // In local development mode, if no public URL is configured, return a URL that points back to the local worker
      // This satisfies the architecture of always returning a URL, while keeping the data flow local.
      const localUrl = new URL(request.url);
      localUrl.pathname = ApiEndpoint.Assets.Base;
      localUrl.search = '';
      localUrl.searchParams.set('guid', guid || '');
      if (hash) localUrl.searchParams.set('hash', hash);
      if (checksum) localUrl.searchParams.set('checksum', checksum);
      
      return jsonResponse(env, { url: localUrl.toString(), delivery: 'local' as const }, HttpStatus.Ok);
    }

    if (!canPresignR2AssetGet(env)) {
      return jsonResponse(
        env,
        { error: ErrorMessage.AssetPresignNotConfigured },
        HttpStatus.ServiceUnavailable
      );
    }
    const signedUrl = await buildR2PresignedGetUrl(
      {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID!,
        R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID!,
        R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY!,
        R2_ASSETS_BUCKET_NAME: env.R2_ASSETS_BUCKET_NAME!,
      },
      r2Key
    );
    return jsonResponse(env, { url: signedUrl, delivery: 'signed' as const }, HttpStatus.Ok);
  }

  if (path === ApiEndpoint.Assets.ManifestRebuild && request.method === HttpMethod.Post) {
    const authError = await requireAuth(request, env, undefined, ErrorMessage.AuthenticationRequired);
    if (authError instanceof Response) return authError;
    const existing = await readEntryIndex(env);
    const next: EntryIndexDocument = existing
      ? { ...existing, generatedAt: new Date().toISOString() }
      : { generatedAt: new Date().toISOString(), resources: [], games: [] };
    await env.ASSETS_BUCKET!.put(AssetContentSlicePath.EntryIndex, JSON.stringify(next), {
      httpMetadata: { contentType: HttpContentType.ApplicationJson },
    });
    return jsonResponse(env, { ok: true }, HttpStatus.Ok);
  }

  if (path === ApiEndpoint.Assets.ManifestCurrentAsset && request.method === HttpMethod.Get) {
    const entryIndex = await readEntryIndex(env);
    if (!entryIndex) {
      return jsonResponse(env, { error: ErrorMessage.ManifestNotFoundSeedFirst }, HttpStatus.NotFound);
    }
    return jsonResponse(
      env,
      {
        system: { assetType: 'Manifest' },
        data: { resources: entryIndex.resources },
      },
      HttpStatus.Ok
    );
  }

  if (isAssetReadRoute(path) && request.method === HttpMethod.Get) {
    const guid = url.searchParams.get('guid');
    const hash = url.searchParams.get('hash');
    const checksum = url.searchParams.get('checksum');

    if (!guid && !hash && !checksum) {
      return jsonResponse(env, { error: ErrorMessage.MissingGuidHashOrChecksum }, HttpStatus.BadRequest);
    }

    const r2KeyRead = await resolveAssetR2Key(env, { guid, hash, checksum });
    if (!r2KeyRead) {
      return jsonResponse(env, { error: ErrorMessage.AssetNotFound }, HttpStatus.NotFound);
    }
    if (shouldRedirectAssetReadToPublicUrl(env)) {
      return redirectResponseToPublicAsset(env, r2KeyRead);
    }

    const isLocalDevRead = env.ENVIRONMENT === Environment.Development && env.TEST_MODE === 'true';
    if (isLocalDevRead) {
      // In local development mode, allow the worker to serve the bytes itself to avoid remote Cloudflare round-trip.
      const object = await env.ASSETS_BUCKET.get(r2KeyRead);
      if (!object) {
        return jsonResponse(env, { error: ErrorMessage.AssetNotFound }, HttpStatus.NotFound);
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      const cors = getCorsHeaders(env);
      for (const [key, value] of Object.entries(cors)) {
        headers.set(key, value);
      }
      return new Response(object.body, { headers });
    }

    return jsonResponse(
      env,
      { error: ErrorMessage.AssetDirectFetchDisabled },
      HttpStatus.Forbidden
    );
  }

  if (path === ApiEndpoint.Assets.List && request.method === HttpMethod.Get) {
    const prefix = url.searchParams.get('prefix');
    const objects = await listAssets(env, prefix);
    return jsonResponse(env, objects, HttpStatus.Ok);
  }

  if (path === ApiEndpoint.Assets.SyncDiff && request.method === HttpMethod.Post) {
    const validation = await validateZodBody(request, env, z.object({
      localIndexHash: z.string().optional(),
    }).strict());
    if (validation.errorResponse) return validation.errorResponse;
    const localIndexHash = validation.data!.localIndexHash || '';
    const { hash: cloudIndexHash, entryIndex } = await getEntryIndexHash(env);
    if (!entryIndex) {
      return jsonResponse(env, { error: ErrorMessage.ManifestNotFoundSeedFirst }, HttpStatus.NotFound);
    }
    const diff = buildSyncDiff(entryIndex.resources, localIndexHash, cloudIndexHash);
    return jsonResponse(env, { ...diff, cloudIndexHash }, HttpStatus.Ok);
  }

  if (path === ApiEndpoint.Assets.UploadImage && request.method === HttpMethod.Post) {
    const authError = await requireAuth(request, env, undefined, ErrorMessage.AuthenticationRequired);
    if (authError instanceof Response) return authError;

    const validation = await validateZodBody(request, env, z.object({
      hash: z.string().min(1),
      content: z.string().min(1),
      contentType: z.string().optional(),
    }).strict());
    if (validation.errorResponse) return validation.errorResponse;
    const body = validation.data!;
    try {
      const uploaded = await uploadImageContent(env, body);
      return jsonResponse(env, { hash: uploaded.hash, url: uploaded.key }, HttpStatus.Ok);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('hash mismatch')) {
        return jsonResponse(
          env,
          { error: ErrorMessage.BadRequest, message: 'Hash mismatch' },
          HttpStatus.BadRequest
        );
      }
      throw error;
    }
  }

  if (
    (path === ApiEndpoint.Assets.UploadBatch || path === ApiEndpoint.Assets.UploadFiles) &&
    request.method === HttpMethod.Post
  ) {
    const authError = await requireAuth(request, env, undefined, ErrorMessage.AuthenticationRequired);
    if (authError instanceof Response) return authError;

    const form = await request.formData();
    const rawFiles = form.getAll('files') as unknown[];
    const files = rawFiles.filter((entry): entry is UploadFileLike => {
      if (typeof entry !== 'object' || entry === null) return false;
      return 'arrayBuffer' in entry && 'name' in entry && 'type' in entry;
    });
    const uploaded = await uploadBatchFiles(env, files);
    return jsonResponse(env, { uploaded: uploaded.length, files: uploaded }, HttpStatus.Ok);
  }

  const key = getAssetPathParam(path);
  if (key && request.method === HttpMethod.Get) {
    const r2KeyPath = await resolveAssetR2KeyFromPathParam(env, key);
    if (!r2KeyPath) {
      return jsonResponse(env, { error: ErrorMessage.AssetNotFound }, HttpStatus.NotFound);
    }
    if (shouldRedirectAssetReadToPublicUrl(env)) {
      return redirectResponseToPublicAsset(env, r2KeyPath);
    }

    const isLocalDevPathParam = env.ENVIRONMENT === Environment.Development && env.TEST_MODE === 'true';
    if (isLocalDevPathParam) {
      const object = await env.ASSETS_BUCKET.get(r2KeyPath);
      if (!object) {
        return jsonResponse(env, { error: ErrorMessage.AssetNotFound }, HttpStatus.NotFound);
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      const cors = getCorsHeaders(env);
      for (const [key, value] of Object.entries(cors)) {
        headers.set(key, value);
      }
      return new Response(object.body, { headers });
    }

    return jsonResponse(
      env,
      { error: ErrorMessage.AssetDirectFetchDisabled },
      HttpStatus.Forbidden
    );
  }

  if (key && request.method === HttpMethod.Put) {
    const authError = await requireAuth(request, env, undefined, ErrorMessage.AuthenticationRequired);
    if (authError instanceof Response) return authError;

    const body = await request.arrayBuffer();
    const contentType = request.headers.get(HttpHeader.ContentType);
    const result = await putAssetByKey(env, key, body, contentType);
    return jsonResponse(env, { guid: key, size: result.size }, HttpStatus.Ok);
  }

  if (key && request.method === HttpMethod.Delete) {
    const authError = await requireAuth(request, env, undefined, ErrorMessage.AuthenticationRequired);
    if (authError instanceof Response) return authError;

    await deleteAssetByKey(env, key);
    return jsonResponse(env, { deleted: true, guid: key }, HttpStatus.Ok);
  }

  if (path === ApiEndpoint.Assets.ScanStatus && request.method === HttpMethod.Get) {
    const entryIndex = await readEntryIndex(env);
    if (entryIndex) {
      const response = buildScanResponseFromResources(entryIndex.resources);
      return jsonResponse(env, response, HttpStatus.Ok);
    }
    return jsonResponse(env, { status: 'empty' }, HttpStatus.Ok);
  }

  const DEV_VERSION_KEY = '.dev/asset-version';
  if (path === ApiEndpoint.Assets.Version && request.method === HttpMethod.Get) {
    const object = await env.ASSETS_BUCKET.get(DEV_VERSION_KEY);
    const version = object ? await object.text() : '0';
    return jsonResponse(env, { version }, HttpStatus.Ok);
  }
  if (path === ApiEndpoint.Assets.NotifyChange && request.method === HttpMethod.Post) {
    const version = Date.now().toString();
    await env.ASSETS_BUCKET.put(DEV_VERSION_KEY, version, {
      httpMetadata: { contentType: 'text/plain' },
    });
    return jsonResponse(env, { ok: true, version }, HttpStatus.Ok);
  }

  return jsonResponse(env, { error: ErrorMessage.NotFound }, HttpStatus.NotFound);
}
