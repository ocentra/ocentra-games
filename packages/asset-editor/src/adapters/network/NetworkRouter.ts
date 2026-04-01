import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets/GetResourceEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import { ScanAssetsEvent } from '@ocentra/eventing-domain/events/assets/ScanAssetsEvent';
import { DeleteAssetEvent } from '@ocentra/eventing-domain/events/assets/DeleteAssetEvent';
import { GetSyncStatusEvent } from '@ocentra/eventing-domain/events/assets/GetSyncStatusEvent';
import { SyncToR2Event } from '@ocentra/eventing-domain/events/assets/SyncToR2Event';
import { SyncFromR2Event } from '@ocentra/eventing-domain/events/assets/SyncFromR2Event';
import { ScanR2StatusEvent } from '@ocentra/eventing-domain/events/assets/ScanR2StatusEvent';
import { GetGameTemplateEvent } from '@ocentra/eventing-domain/events/assets/GetGameTemplateEvent';
import { UploadImageEvent } from '@ocentra/eventing-domain/events/assets/UploadImageEvent';
import { UploadFilesEvent } from '@ocentra/eventing-domain/events/assets/UploadFilesEvent';
import type { UploadedFile } from '@ocentra/eventing-domain/events/assets/UploadFilesEvent';
import { BatchGetResourcesEvent } from '@ocentra/eventing-domain/events/assets/BatchGetResourcesEvent';
import { NetworkRouterHandlerMarker } from '@ocentra/eventing-domain/interfaces/IEventHandler';
import type { AssetEntry } from '@ocentra/boundary-domain/types/asset-entry';
import type { ScanResponse } from '@ocentra/boundary-domain/types/scan-response';
import type { ResourceRequest } from '@ocentra/boundary-domain/types/resource-request';
import type { AssetMetadata } from '@ocentra/boundary-domain/types/asset-metadata';
import type { AssetSyncStatus } from '@/lib/core/inspector/types';
import {
  setPreferredAssetUrl,
  getAssetUrlByGuidAsync,
  getAssetCandidateUrls,
} from '@/adapters/assets/TauriAssetUrlResolver';
import {
  deleteAsset as deleteLocalAsset,
  getLocalIndexHash,
  readAsset,
  rebuildIndex,
  writeAsset,
} from '@/adapters/assets/TauriAssetAdapter';
import { buildAppAssetSlicesFromDisk } from '@/adapters/assets/buildAppAssetSlicesFromDisk';
import { getDiskResourceEntries } from '@/adapters/assets/diskResourceLoader';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import JSON5 from 'json5';
import { AssetDocumentSchema } from '@/lib/validation/schemas';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import {
  AssetEditorSyncTarget,
  getActiveAssetEditorSyncTarget,
} from '@/services/storage/syncTarget';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const logInfo = (message: string, data?: unknown) =>
  log.logInfo(message, getStackTrace(), data);
const logError = (message: string, data?: unknown) =>
  log.logError(message, getStackTrace(), data);
const logWarn = (message: string, data?: unknown) =>
  log.logWarn(message, getStackTrace(), data);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif']);

type CloudSyncDiff = {
  cloudOnly: string[];
  localNewer: string[];
  cloudNewer: string[];
  inSync: number;
  cloudIndexHash?: string;
};

type ComputedUploadEntry = {
  resourcePath: string;
  contentBytes: Uint8Array;
  checksum: string;
  entry: Record<string, unknown>;
  mimeType: string;
  isAssetRegistryAsset: boolean;
};

const SYNC_CONCURRENCY = 6;

function nowIso(): string {
  return new Date().toISOString();
}

function getWorkerApiBase(): string {
  const workerUrl = getStorageConfig().r2Assets?.workerUrl?.replace(/\/$/, '') || '';
  if (!workerUrl) {
    throw new Error('Cloud sync target is not configured. Set the editor sync target to a configured worker.');
  }
  return `${workerUrl}/api/v1`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function normalizeResourcePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) {
    return 'Resources';
  }
  if (normalized.startsWith('Resources/')) {
    return normalized;
  }
  if (normalized === 'Resources') {
    return normalized;
  }
  return `Resources/${normalized}`;
}

function getFileExtension(path: string): string {
  const fileName = path.split('/').pop() ?? path;
  const idx = fileName.lastIndexOf('.');
  if (idx < 0) {
    return '';
  }
  return fileName.substring(idx).toLowerCase();
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'asset';
  }
  return trimmed
    .replace(/[<>:"/\\|?*]/g, '_')
    // eslint-disable-next-line no-control-regex -- intentional: strip control chars from filenames
    .replace(/[\u0000-\u001F]/g, '_')
    .replace(/\s+/g, '_');
}

async function uploadSingleAssetToLocalWorker(
  resourcePath: string,
  contentBytes: Uint8Array,
  mimeType: string
): Promise<void> {
  const base = getWorkerApiBase();
  const pathForPut = normalizeResourcePath(resourcePath);
  const contentType =
    mimeType || (pathForPut.endsWith('.asset') ? 'application/json' : 'application/octet-stream');
  const putRes = await fetch(`${base}/assets/${encodeURIComponent(pathForPut)}`, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: contentBytes as BodyInit,
  });
  if (!putRes.ok) {
    throw new Error(`PUT ${pathForPut}: ${putRes.status}`);
  }
  const { uploads } = await buildAppAssetSlicesFromDisk();
  for (const slice of uploads) {
    const sliceRes = await fetch(`${base}/assets/${encodeURIComponent(slice.key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': slice.contentType },
      body: new TextDecoder().decode(slice.contentBytes),
    });
    if (!sliceRes.ok) {
      throw new Error(`PUT ${slice.key}: ${sliceRes.status}`);
    }
  }
  const notifyRes = await fetch(`${base}/assets/notify-change`, { method: 'POST' });
  if (!notifyRes.ok) {
    throw new Error(`POST notify-change: ${notifyRes.status}`);
  }
}

async function runWithConcurrency<TInput, TOutput>(
  items: readonly TInput[],
  concurrency: number,
  worker: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  if (items.length === 0) {
    return [];
  }

  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= items.length) {
          return;
        }
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      }
    })
  );

  return results;
}

function getImageExtension(mimeType: string | undefined, fileName: string | undefined): string {
  if (fileName) {
    const ext = getFileExtension(fileName);
    if (ext && IMAGE_EXTENSIONS.has(ext)) {
      return ext;
    }
  }
  switch ((mimeType || '').toLowerCase()) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/bmp':
      return '.bmp';
    case 'image/svg+xml':
      return '.svg';
    case 'image/avif':
      return '.avif';
    case 'image/png':
    default:
      return '.png';
  }
}

function decodeBase64(content: string): Uint8Array {
  const commaIndex = content.indexOf(',');
  const payload = commaIndex >= 0 ? content.slice(commaIndex + 1) : content;
  const binary = atob(payload);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digestInput = new Uint8Array(bytes.byteLength);
  digestInput.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', digestInput);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function resolveTargetFolderPath(targetId: string, urlById: string | null): string {
  if (targetId === 'root') {
    return 'Resources';
  }
  if (targetId.startsWith('folder:')) {
    return normalizeResourcePath(targetId.slice('folder:'.length));
  }
  if (urlById) {
    const normalizedPath = urlById.replace(/^\/+/, '');
    const slash = normalizedPath.lastIndexOf('/');
    if (slash > 0) {
      return normalizedPath.substring(0, slash);
    }
  }
  return normalizeResourcePath(targetId);
}

async function computeUploadEntry(
  guid: string,
  content: string,
  metadata: AssetMetadata,
  existing: Record<string, unknown> | undefined,
  existingPath: string | null
): Promise<ComputedUploadEntry> {
  const now = nowIso();
  const mimeType = (
    metadata.mimeType ||
    (typeof existing?.mimeType === 'string' ? existing.mimeType : '') ||
    'application/json'
  ).toLowerCase();
  const isImageUpload =
    (metadata.assetType || '').toLowerCase() === 'image' || mimeType.startsWith('image/');

  let resourcePath = '';
  let contentBytes: Uint8Array;
  let checksum = '';
  let entry: Record<string, unknown>;

  if (isImageUpload) {
    contentBytes = decodeBase64(content);
    checksum = await sha256Hex(contentBytes);
    const extension = getImageExtension(mimeType, metadata.displayName);
    resourcePath = existingPath ?? normalizeResourcePath(`Resources/Images/${guid}${extension}`);

    entry = {
      ...(existing ?? {}),
      path: resourcePath,
      displayName: metadata.displayName || (resourcePath.split('/').pop() ?? guid),
      gameId: metadata.gameId ?? (typeof existing?.gameId === 'string' ? existing.gameId : null),
      category: metadata.category ?? (typeof existing?.category === 'string' ? existing.category : 'Content'),
      mimeType,
      fileSize: contentBytes.length,
      createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : now,
      updatedAt: now,
      lastScanAt: now,
      hash: guid,
      resourceEntryType: 'ImageResourceEntry',
      checksum,
    };
  } else {
    contentBytes = new TextEncoder().encode(content);
    checksum = await sha256Hex(contentBytes);

    let parsed: Record<string, unknown> = {};
    try {
      const raw = JSON5.parse(content) as unknown;
      const result = AssetDocumentSchema.safeParse(raw);
      parsed = result.success ? (result.data as Record<string, unknown>) : {};
    } catch {
      parsed = {};
    }

    const parsedSystem =
      parsed.system && typeof parsed.system === 'object'
        ? (parsed.system as Record<string, unknown>)
        : {};
    const parsedData =
      parsed.data && typeof parsed.data === 'object'
        ? (parsed.data as Record<string, unknown>)
        : {};
    const treePath = typeof parsedSystem.treePath === 'string' ? parsedSystem.treePath : '';
    const fallbackName = sanitizeFileName(
      metadata.displayName || (typeof parsedSystem.displayName === 'string' ? parsedSystem.displayName : guid)
    );
    resourcePath = normalizeResourcePath(treePath || existingPath || `Resources/${fallbackName}.asset`);

    const inheritanceChain = Array.isArray(metadata.inheritanceChain)
      ? metadata.inheritanceChain
      : Array.isArray(parsedSystem.inheritanceChain)
        ? parsedSystem.inheritanceChain
        : Array.isArray(parsedData.inheritanceChain)
          ? parsedData.inheritanceChain
          : (Array.isArray(existing?.inheritanceChain) ? existing.inheritanceChain : null);
    const variant =
      typeof parsedSystem.variant === 'string'
        ? parsedSystem.variant
        : (typeof parsedData.variant === 'string'
            ? parsedData.variant
            : (typeof existing?.variant === 'string' ? existing.variant : null));

    entry = {
      ...(existing ?? {}),
      path: resourcePath,
      displayName:
        metadata.displayName ||
        (typeof parsedSystem.displayName === 'string'
          ? parsedSystem.displayName
          : (resourcePath.split('/').pop()?.replace(/\.asset$/i, '') ?? guid)),
      gameId:
        metadata.gameId ??
        (typeof parsedSystem.gameId === 'string'
          ? parsedSystem.gameId
          : (typeof existing?.gameId === 'string' ? existing.gameId : null)),
      category:
        metadata.category ??
        (typeof parsedSystem.category === 'string'
          ? parsedSystem.category
          : (typeof existing?.category === 'string' ? existing.category : null)),
      mimeType,
      fileSize: contentBytes.length,
      createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : now,
      updatedAt: now,
      lastScanAt: now,
      checksum,
      guid,
      resourceEntryType: 'AssetResourceEntry',
      assetType:
        metadata.assetType ||
        (typeof parsedSystem.assetType === 'string'
          ? parsedSystem.assetType
          : (typeof existing?.assetType === 'string' ? existing.assetType : 'Unknown')),
      inheritanceChain: inheritanceChain ?? null,
      variant: variant ?? null,
    };
  }

  const isAssetRegistryAsset =
    resourcePath.toLowerCase() === 'resources/assetregistry.asset' ||
    (typeof entry.assetType === 'string' && entry.assetType.toLowerCase() === 'assetregistry');

  return {
    resourcePath,
    contentBytes,
    checksum,
    entry,
    mimeType,
    isAssetRegistryAsset,
  };
}

export class NetworkRouter {
  private static instance: NetworkRouter | null = null;
  private static eventRegistrar = new EventRegistrar();

  private constructor() {}

  static getInstance(): NetworkRouter {
    if (!NetworkRouter.instance) {
      NetworkRouter.instance = new NetworkRouter();
    }
    return NetworkRouter.instance;
  }

  subscribeToEvents(): void {
    NetworkRouter.eventRegistrar.subscribeAsync(GetResourceEvent, NetworkRouter.onGetResourceEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(BatchGetResourcesEvent, NetworkRouter.onBatchGetResourcesEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(UploadAssetEvent, NetworkRouter.onUploadAssetEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(ScanAssetsEvent, NetworkRouter.onScanAssetsEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(DeleteAssetEvent, NetworkRouter.onDeleteAssetEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(GetSyncStatusEvent, NetworkRouter.onGetSyncStatusEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(SyncToR2Event, NetworkRouter.onSyncToR2Event);
    NetworkRouter.eventRegistrar.subscribeAsync(SyncFromR2Event, NetworkRouter.onSyncFromR2Event);
    NetworkRouter.eventRegistrar.subscribeAsync(ScanR2StatusEvent, NetworkRouter.onScanR2StatusEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(GetGameTemplateEvent, NetworkRouter.onGetGameTemplateEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(UploadImageEvent, NetworkRouter.onUploadImageEvent);
    NetworkRouter.eventRegistrar.subscribeAsync(UploadFilesEvent, NetworkRouter.onUploadFilesEvent);
    logInfo('Editor NetworkRouter subscribed to events');
  }

  unsubscribeFromEvents(): void {
    NetworkRouter.eventRegistrar.unsubscribeAll();
  }

  private static async onGetResourceEvent(event: GetResourceEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      const response = await NetworkRouter.getInstance().getResource(event.request);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(response));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get resource';
      logError('GetResource failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onBatchGetResourcesEvent(event: BatchGetResourcesEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      const entries = await Promise.all(
        event.guids.map(async (guid) => {
          const res = await NetworkRouter.getInstance().getResource({ guid });
          const buf = await res.arrayBuffer();
          return [guid, buf] as [string, ArrayBuffer];
        })
      );
      const map = new Map<string, ArrayBuffer>(entries);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(map));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to batch get resources';
      logError('BatchGetResources failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onUploadAssetEvent(event: UploadAssetEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      const entry = await NetworkRouter.getInstance().uploadAsset(event.guid, event.content, event.metadata as AssetMetadata);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(entry));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload asset';
      logError('UploadAsset failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onScanAssetsEvent(event: ScanAssetsEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      const result = await NetworkRouter.getInstance().scanAssets();
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(result));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to scan assets';
      logError('ScanAssets failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onDeleteAssetEvent(event: DeleteAssetEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      await NetworkRouter.getInstance().deleteAsset(event.guid);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(undefined));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete asset';
      logError('DeleteAsset failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onGetSyncStatusEvent(event: GetSyncStatusEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      const status = await NetworkRouter.getInstance().getSyncStatus();
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(status));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get sync status';
      logError('GetSyncStatus failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onSyncToR2Event(event: SyncToR2Event): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      await NetworkRouter.getInstance().syncToR2();
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(undefined));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to sync to R2';
      logError('SyncToR2 failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onSyncFromR2Event(event: SyncFromR2Event): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      await NetworkRouter.getInstance().syncFromR2();
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(undefined));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to sync from R2';
      logError('SyncFromR2 failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onScanR2StatusEvent(event: ScanR2StatusEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(undefined));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get R2 scan status';
      logError('ScanR2Status failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onGetGameTemplateEvent(event: GetGameTemplateEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      const findTemplate = (resources: Array<Record<string, unknown>>): Record<string, unknown> | null => {
        return (
          resources.find((resource) => {
            const gameId = typeof resource.gameId === 'string' ? resource.gameId : null;
            const category = typeof resource.category === 'string' ? resource.category : null;
            return gameId === event.gameId && category === event.category;
          }) ?? null
        );
      };

      const entries = await getDiskResourceEntries();
      const localResources = entries.map((e) => {
        const r = e as unknown as Record<string, unknown>;
        return { path: r.path, displayName: r.displayName, guid: r.guid, hash: r.hash, checksum: r.checksum, gameId: r.gameId, category: r.category };
      });
      const localTemplate = findTemplate(localResources);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success((localTemplate ?? {}) as Record<string, unknown>));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get game template';
      logError('GetGameTemplate failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onUploadImageEvent(event: UploadImageEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      const path = await NetworkRouter.getInstance().uploadImage(event.hash, event.content);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success({ path }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload image';
      logError('UploadImage failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  private static async onUploadFilesEvent(event: UploadFilesEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) return;
    try {
      const result = await NetworkRouter.getInstance().uploadFiles(event.files, event.targetId);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.success(result));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload files';
      logError('UploadFiles failed', error);
      if (!event.deferred.isSettled()) event.deferred.resolve(OperationResult.failure(msg));
    }
  }

  async getResource(request: ResourceRequest): Promise<Response> {
    const key =
      ('guid' in request && request.guid) ? request.guid :
      ('hash' in request && request.hash) ? request.hash :
      ('checksum' in request && request.checksum) ? request.checksum : null;

    if (!key && request.assetType) {
      const entries = await getDiskResourceEntries();
      const match = entries.find(
        (e) =>
          e instanceof AssetResourceEntry &&
          (e.assetType as string) === request.assetType
      ) as AssetResourceEntry | undefined;
      if (match?.path) {
        try {
          const response = await readAsset(match.path);
          if (response.ok) return response;
        } catch (error) {
          logInfo('GetResource by assetType read failed', {
            assetType: request.assetType,
            path: match.path,
            error: toErrorMessage(error),
          });
        }
      }
    }

    if (!key) {
      const identifier = JSON.stringify(request);
      return new Response(`Asset not found: ${identifier}`, { status: 404, statusText: 'Not Found' });
    }

    const directUrl = await getAssetUrlByGuidAsync(key);
    const candidateUrls = await getAssetCandidateUrls(key);
    const orderedUrls = Array.from(
      new Set(
        [directUrl, ...candidateUrls]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    );

    if (orderedUrls.length === 0) {
      logWarn('GetResource identifier not in DB', { key, request });
      return new Response(`Asset not found: ${key}`, { status: 404, statusText: 'Not Found' });
    }

    for (const candidateUrl of orderedUrls) {
      try {
        if (candidateUrl.startsWith('http://') || candidateUrl.startsWith('https://')) {
          const response = await fetch(candidateUrl);
          if (response.ok) {
            setPreferredAssetUrl(key, candidateUrl);
            return response;
          }
          logInfo('GetResource remote candidate returned non-ok response', {
            key,
            candidateUrl,
            status: response.status,
          });
          continue;
        }
        const resourcePath = candidateUrl.replace(/^\/+/, '');
        const response = await readAsset(resourcePath);
        if (response.ok) {
          setPreferredAssetUrl(key, candidateUrl);
          return response;
        }
        logInfo('GetResource candidate returned non-ok response', {
          key,
          candidateUrl,
          status: response.status,
        });
      } catch (error) {
        logInfo('GetResource candidate failed, trying next path', {
          key,
          candidateUrl,
          error: toErrorMessage(error),
        });
      }
    }

    logWarn('GetResource exhausted candidate paths without success', {
      key,
      request,
      orderedUrls,
    });
    return new Response(`Asset not found for identifier: ${key}`, { status: 404, statusText: 'Not Found' });
  }

  async uploadAsset(guid: string, content: string, metadata: AssetMetadata): Promise<AssetEntry> {
    const now = nowIso();
    let existing: Record<string, unknown> | undefined;
    let existingPath: string | null = null;
    try {
      const { getResourceByGuidDb, getResourceByHashDb } = await import('@/adapters/assets/TauriAssetAdapter');
      const guidEntry = await getResourceByGuidDb(guid);
      const hashEntry = await getResourceByHashDb(guid);
      const dbEntry = guidEntry ?? hashEntry;
      if (dbEntry && 'path' in dbEntry && dbEntry.path) {
        existingPath = normalizeResourcePath(dbEntry.path);
      }
      existing = dbEntry ? (dbEntry as unknown as Record<string, unknown>) : undefined;
    } catch {
      existing = undefined;
    }
    const { resourcePath, contentBytes, checksum, entry, mimeType } =
      await computeUploadEntry(guid, content, metadata, existing, existingPath);
    const preferredPath = `/${resourcePath}`;

    if (typeof entry.guid === 'string' && entry.guid.length > 0) {
      setPreferredAssetUrl(entry.guid, preferredPath);
    }
    if (typeof entry.hash === 'string' && entry.hash.length > 0) {
      setPreferredAssetUrl(entry.hash, preferredPath);
    }
    if (typeof entry.checksum === 'string' && entry.checksum.length > 0) {
      setPreferredAssetUrl(entry.checksum, preferredPath);
    }

    await writeAsset(`/${resourcePath}`, contentBytes);

    if (
      getActiveAssetEditorSyncTarget() === AssetEditorSyncTarget.LocalDev &&
      resourcePath.toLowerCase() !== 'resources/assetregistry.asset'
    ) {
      setTimeout(() => {
        void uploadSingleAssetToLocalWorker(resourcePath, contentBytes, mimeType).catch((err) => {
          logWarn('Auto-upload to local worker failed (asset saved to disk)', {
            path: resourcePath,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }, 0);
    }

    return {
      guid,
      type: typeof entry.assetType === 'string' ? entry.assetType : (metadata.assetType || 'Unknown'),
      displayName: typeof entry.displayName === 'string' ? entry.displayName : (metadata.displayName || guid),
      category: typeof entry.category === 'string' ? entry.category : null,
      gameId: typeof entry.gameId === 'string' ? entry.gameId : null,
      path: resourcePath,
      metaPath: null,
      checksum,
      mimeType,
      fileSize: contentBytes.length,
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : now,
      updatedAt: now,
      lastScanAt: now,
      inheritanceChain: Array.isArray(entry.inheritanceChain) ? (entry.inheritanceChain as string[]) : null,
    };
  }

  async deleteAsset(identifier: string): Promise<void> {
    const preferredUrl = await getAssetUrlByGuidAsync(identifier);
    const candidateUrls = await getAssetCandidateUrls(identifier);
    const candidatePaths = Array.from(
      new Set(
        [
          ...(preferredUrl ? [preferredUrl] : []),
          ...candidateUrls,
          identifier.includes('/') ? identifier : null,
        ]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .filter((value) => !/^https?:\/\//i.test(value))
          .map((value) => value.replace(/^\/+/, ''))
          .filter((value) => !value.startsWith('virtual:') && !value.startsWith('folder:'))
      )
    );

    if (candidatePaths.length === 0) {
      logWarn('DeleteAsset unresolved local path', { identifier });
      throw new Error(`Delete failed: unresolved local path for "${identifier}"`);
    }

    let deletedAny = false;
    for (const candidatePath of candidatePaths) {
      try {
        logInfo('DeleteAsset local delete attempt', { identifier, candidatePath });
        await deleteLocalAsset(candidatePath);
        deletedAny = true;
        logInfo('DeleteAsset local delete success', { identifier, candidatePath });
      } catch (error) {
        const message = toErrorMessage(error);
        const isMissingFile = /(os error 2|cannot find|no such file)/i.test(message);
        if (!isMissingFile) {
          logError('DeleteAsset local delete failed for candidate path', {
            identifier,
            candidatePath,
            error: message,
          });
        } else {
          logInfo('DeleteAsset candidate missing on disk, continuing', {
            identifier,
            candidatePath,
          });
        }
      }
    }

    if (!deletedAny) {
      throw new Error(`Delete failed: no local asset matched "${identifier}"`);
    }

    await rebuildIndex();
    logInfo('DeleteAsset local operation complete', { identifier });
  }

  async scanAssets(): Promise<ScanResponse> {
    const resources = await getDiskResourceEntries();
      const assets: ScanResponse['assets'] = [];
      const images: ScanResponse['images'] = [];
      const files: ScanResponse['files'] = [];

      for (const resource of resources) {
        const path = typeof resource.path === 'string' ? normalizeResourcePath(resource.path) : '';
        if (!path || path.toLowerCase() === 'resources/assetregistry.asset') {
          continue;
        }

        const displayName = typeof resource.displayName === 'string' ? resource.displayName : path.split('/').pop() ?? path;
        const category = typeof resource.category === 'string' ? resource.category : null;
        const gameId = typeof resource.gameId === 'string' ? resource.gameId : null;
        const mimeType = typeof resource.mimeType === 'string' ? resource.mimeType : 'application/octet-stream';
        const fileSize = typeof resource.fileSize === 'number' ? resource.fileSize : 0;
        const createdAt = typeof resource.createdAt === 'string' ? resource.createdAt : nowIso();
        const updatedAt = typeof resource.updatedAt === 'string' ? resource.updatedAt : createdAt;
        const lastScanAt = typeof resource.lastScanAt === 'string' ? resource.lastScanAt : updatedAt;

        if (resource instanceof AssetResourceEntry && resource.guid) {
          assets.push({
            guid: resource.guid,
            type: resource.assetType || 'Unknown',
            displayName,
            category,
            gameId,
            path,
            metaPath: null,
            checksum: typeof resource.checksum === 'string' ? resource.checksum : '',
            mimeType,
            fileSize,
            createdAt,
            updatedAt,
            lastScanAt,
            inheritanceChain: resource.inheritanceChain ?? null,
          });
          continue;
        }

        if (resource instanceof ImageResourceEntry && resource.hash) {
          images.push({
            hash: resource.hash,
            path,
            metaPath: null,
            mimeType,
            fileSize,
            gameId,
            createdAt,
            updatedAt,
            lastScanAt,
          });
          continue;
        }

        if (resource instanceof FileResourceEntry && resource.checksum) {
          files.push({
            checksum: resource.checksum,
            path,
            metaPath: null,
            mimeType,
            fileSize,
            gameId,
            createdAt,
            updatedAt,
            lastScanAt,
          });
        }
      }

      return {
        scanId: crypto.randomUUID(),
        timestamp: nowIso(),
        stats: {
          totalAssets: assets.length,
          assetsWithMeta: assets.length,
          assetsNeedingMeta: 0,
          imagesWithMeta: images.length,
          imagesNeedingMeta: 0,
        },
        assets,
        images,
        files,
        needsMeta: {
          assets: [],
          files: [],
        },
        hasMore: false,
        cursor: null,
      };
  }

  async getSyncStatus(): Promise<AssetSyncStatus> {
    try {
      const localIndexHash = await getLocalIndexHash();
      const res = await fetch(`${getWorkerApiBase()}/assets/sync/diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localIndexHash }),
      });
      if (!res.ok) {
        return {};
      }
      const diff = await res.json() as CloudSyncDiff;
      const changed = diff.localNewer.length + diff.cloudNewer.length;
      const totalAssets = diff.inSync + changed + diff.cloudOnly.length;
      return {
        totalAssets,
        synced: diff.inSync,
        changed,
        notInCloud: diff.localNewer.length,
      };
    } catch {
      return {};
    }
  }

  async syncToR2(): Promise<void> {
    const diskResources = await getDiskResourceEntries();
    const uploadableResources = diskResources.filter((resource) => {
      const path = typeof resource.path === 'string' ? normalizeResourcePath(resource.path) : '';
      return path.length > 0 && path.toLowerCase() !== 'resources/assetregistry.asset';
    });

    const uploaded = (
      await runWithConcurrency(uploadableResources, SYNC_CONCURRENCY, async (resource) => {
        const path = typeof resource.path === 'string' ? normalizeResourcePath(resource.path) : '';
        try {
          const localResponse = await readAsset(path);
          if (!localResponse.ok) {
            return 0;
          }
          const contentType =
            (typeof resource.mimeType === 'string' && resource.mimeType) ||
            localResponse.headers.get('Content-Type') ||
            'application/octet-stream';
          const body = await localResponse.arrayBuffer();
          const uploadRes = await fetch(`${getWorkerApiBase()}/assets/${encodeURIComponent(path)}`, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body,
          });
          if (!uploadRes.ok) {
            throw new Error(`Upload failed for ${path}: ${uploadRes.status}`);
          }
          return true;
        } catch (error) {
          logError('SyncToR2 upload failed for resource', {
            path,
            error: toErrorMessage(error),
          });
          return false;
        }
      })
    ).filter(Boolean).length;

    const generatedSlices = await buildAppAssetSlicesFromDisk();
    const uploadedSlices = (
      await runWithConcurrency(generatedSlices.uploads, SYNC_CONCURRENCY, async (slice) => {
        try {
          const uploadRes = await fetch(`${getWorkerApiBase()}/assets/${encodeURIComponent(slice.key)}`, {
            method: 'PUT',
            headers: { 'Content-Type': slice.contentType },
            body: new TextDecoder().decode(slice.contentBytes),
          });
          if (!uploadRes.ok) {
            throw new Error(`Upload failed for ${slice.key}: ${uploadRes.status}`);
          }
          return true;
        } catch (error) {
          logError('SyncToR2 upload failed for generated slice', {
            key: slice.key,
            error: toErrorMessage(error),
          });
          return false;
        }
      })
    ).filter(Boolean).length;

    logInfo('SyncToR2 complete', { uploaded, uploadedSlices });
  }

  async syncFromR2(): Promise<void> {
    const workerBase = getWorkerApiBase();
    const entryIndexRes = await fetch(`${workerBase}/assets/${encodeURIComponent(AssetContentSlicePath.EntryIndex)}`);
    if (!entryIndexRes.ok) {
      throw new Error(`SyncFromR2 failed to fetch cloud entry index: ${entryIndexRes.status}`);
    }

    const entryIndex = await entryIndexRes.json() as { resources?: Array<Record<string, unknown>> };
    const resources = Array.isArray(entryIndex.resources) ? entryIndex.resources : [];

    const syncableResources = resources.filter((resource) => {
      const path = typeof resource.path === 'string' ? normalizeResourcePath(resource.path) : '';
      return path.length > 0 && path.toLowerCase() !== 'resources/assetregistry.asset';
    });

    const synced = (
      await runWithConcurrency(syncableResources, SYNC_CONCURRENCY, async (resource) => {
        const path = typeof resource.path === 'string' ? normalizeResourcePath(resource.path) : '';
        const guid = typeof resource.guid === 'string' ? resource.guid : null;
        const hash = typeof resource.hash === 'string' ? resource.hash : null;
        const checksum = typeof resource.checksum === 'string' ? resource.checksum : null;

        let requestUrl = `${workerBase}/assets?`;
        if (guid) {
          requestUrl += `guid=${encodeURIComponent(guid)}`;
        } else if (hash) {
          requestUrl += `hash=${encodeURIComponent(hash)}`;
        } else if (checksum) {
          requestUrl += `checksum=${encodeURIComponent(checksum)}`;
        } else {
          requestUrl = `${workerBase}/assets/${encodeURIComponent(path)}`;
        }

        try {
          const assetRes = await fetch(requestUrl);
          if (!assetRes.ok) {
            return false;
          }
          const bytes = new Uint8Array(await assetRes.arrayBuffer());
          await writeAsset(`/${path}`, bytes);
          return true;
        } catch (error) {
          logError('SyncFromR2 resource sync failed', {
            path,
            error: toErrorMessage(error),
          });
          return false;
        }
      })
    ).filter(Boolean).length;

    logInfo('SyncFromR2 complete', { resources: resources.length, synced });
  }

  async uploadImage(hash: string, content: string): Promise<string> {
    const mimeType = 'image/png';
    const bytes = decodeBase64(content);
    const extension = getImageExtension(mimeType, undefined);
    const resourcePath = normalizeResourcePath(`Resources/Images/${hash}${extension}`);
    await writeAsset(`/${resourcePath}`, bytes);
    return resourcePath;
  }

  async uploadFiles(files: File[], targetId: string): Promise<{ uploaded: number; files: UploadedFile[] }> {
    const targetUrl = await getAssetUrlByGuidAsync(targetId);
    const targetFolder = resolveTargetFolderPath(targetId, targetUrl);

    const uploadedFiles = await runWithConcurrency(files, SYNC_CONCURRENCY, async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const resourcePath = normalizeResourcePath(`${targetFolder}/${sanitizeFileName(file.name)}`);
      await writeAsset(`/${resourcePath}`, bytes);
      return { filename: file.name, path: resourcePath };
    });

    return { uploaded: uploadedFiles.length, files: uploadedFiles };
  }
}
