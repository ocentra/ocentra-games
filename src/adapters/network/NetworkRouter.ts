import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import type { ResourceRequest } from '@ocentra/network-domain/router-types';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets/GetResourceEvent';
import { BatchGetResourcesEvent } from '@ocentra/eventing-domain/events/assets/BatchGetResourcesEvent';
import type { INetworkRouterHandler } from '@ocentra/eventing-domain/interfaces/IEventHandler';
import { NetworkRouterHandlerMarker } from '@ocentra/eventing-domain/interfaces/IEventHandler';
import { SaveLogsEvent } from '@ocentra/eventing-domain/events/logs/SaveLogsEvent';
import { QueryLogsEvent } from '@ocentra/eventing-domain/events/logs/QueryLogsEvent';
import { GetLogStatsEvent } from '@ocentra/eventing-domain/events/logs/GetLogStatsEvent';
import { ClearLogsEvent } from '@ocentra/eventing-domain/events/logs/ClearLogsEvent';
import { isLocalHostname } from '@ocentra/endpoint-domain/constants/hostname';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import { getPlatformAssetRuntime } from '@/adapters/assets/PlatformAssetRuntime';
import { resolvePlatformAssetRequest } from '@/adapters/assets/RuntimeAssetResolver';
import { MainAppAssetTarget } from '@/services/storage/assetTarget';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_RESOURCE_RESPONSES = true;
const LOG_NETWORK_ROUTER_INIT = true;
const LOG_ASSET_FLOW = true;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

export class NetworkRouter implements INetworkRouterHandler {
  static executionOrder = -102;
  static readonly HANDLER_MARKER = NetworkRouterHandlerMarker;

  private static instance: NetworkRouter | null = null;
  private static eventRegistrar: EventRegistrar | null = null;

  public readonly isDev: boolean;

  static {
    NetworkRouter.setupEventSubscription();
    NetworkRouter.registerService();
  }

  private constructor() {
    this.isDev = import.meta.env.DEV || isLocalHostname(window.location.hostname);

    logInfo(
      '[ASSET-FLOW] NetworkRouter initialized',
      {
        data: {
          assetsPublicUrl: getStorageConfig().assetsPublicUrl || '(empty)',
          hasR2Assets: !!getStorageConfig().r2Assets,
          isDev: this.isDev,
        },
      },
      LOG_NETWORK_ROUTER_INIT
    );
  }

  get HANDLER_MARKER(): typeof NetworkRouterHandlerMarker {
    return NetworkRouterHandlerMarker;
  }

  get eventRegistrar(): EventRegistrar {
    if (!NetworkRouter.eventRegistrar) {
      NetworkRouter.setupEventSubscription();
    }
    return NetworkRouter.eventRegistrar!;
  }

  static getInstance(): NetworkRouter {
    if (!NetworkRouter.instance) {
      NetworkRouter.instance = new NetworkRouter();
    }
    return NetworkRouter.instance;
  }

  subscribeToEvents(): void {
    NetworkRouter.setupEventSubscription();
  }

  unsubscribeFromEvents(): void {
    if (NetworkRouter.eventRegistrar) {
      NetworkRouter.eventRegistrar.unsubscribeAll();
      NetworkRouter.eventRegistrar = null;
    }
  }

  private static registerService(): void {
    ServiceRegistry.register(
      this as { executionOrder?: number },
      'NetworkRouter',
      () => Promise.resolve(NetworkRouter.getInstance())
    );
  }

  private static setupEventSubscription(): void {
    if (this.eventRegistrar) {
      return;
    }

    this.eventRegistrar = new EventRegistrar();
    this.eventRegistrar.subscribeAsync(GetResourceEvent, this.onGetResourceEvent.bind(this));
    this.eventRegistrar.subscribeAsync(BatchGetResourcesEvent, this.onBatchGetResourcesEvent.bind(this));
    this.eventRegistrar.subscribeAsync(SaveLogsEvent, this.onSaveLogsEvent.bind(this));
    this.eventRegistrar.subscribeAsync(QueryLogsEvent, this.onQueryLogsEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetLogStatsEvent, this.onGetLogStatsEvent.bind(this));
    this.eventRegistrar.subscribeAsync(ClearLogsEvent, this.onClearLogsEvent.bind(this));
  }

  private static async onGetResourceEvent(event: GetResourceEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) {
      return;
    }

    logInfo(
      '[ASSET-FLOW] GetResourceEvent received',
      { data: { request: event.request } },
      true
    );
    try {
      const response = await NetworkRouter.getInstance().getResource(event.request);
      logInfo(
        '[ASSET-FLOW] GetResourceEvent success',
        { data: { ok: response.ok, status: response.status } },
        true
      );
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(response));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get resource';
      logError('[ASSET-FLOW] GetResourceEvent failed', { data: { error: failureMessage, request: event.request } });
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onBatchGetResourcesEvent(event: BatchGetResourcesEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== NetworkRouterHandlerMarker) {
      return;
    }

    logInfo(
      '[ASSET-FLOW] BatchGetResourcesEvent received',
      { data: { guids: event.guids, count: event.guids.length } },
      true
    );
    try {
      const results = await NetworkRouter.getInstance().batchGetResources(event.guids);
      logInfo(
        '[ASSET-FLOW] BatchGetResourcesEvent success',
        { data: { requested: event.guids.length, received: results.size } },
        true
      );
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(results));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to batch get resources';
      logError('[ASSET-FLOW] BatchGetResourcesEvent failed', { data: { error: failureMessage, guids: event.guids } });
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onSaveLogsEvent(event: SaveLogsEvent): Promise<void> {
    try {
      const ndjson = event.logs.map((entry) => JSON.stringify(entry)).join('\n');
      const response = await fetch(LocalApiEndpoint.Logs.Base, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: 'application/x-ndjson' },
        body: ndjson,
      });
      if (!response.ok) {
        event.deferred.reject(new Error(`Save logs failed: ${response.status}`));
        return;
      }
      await response.text().catch(() => undefined);
      event.deferred.resolve(OperationResult.success(undefined));
    } catch (error) {
      event.deferred.reject(error);
    }
  }

  private static async onQueryLogsEvent(event: QueryLogsEvent): Promise<void> {
    try {
      const url = `${LocalApiEndpoint.Logs.Query}?${event.queryParams.toString()}`;
      const response = await fetch(url, { method: HttpMethod.Get });
      if (!response.ok) {
        await response.text().catch(() => undefined);
        event.deferred.reject(new Error(`Query logs failed: ${response.status}`));
        return;
      }
      const data = (await response.json()) as { logs: unknown[] };
      event.deferred.resolve(OperationResult.success({ logs: data.logs ?? [] }));
    } catch (error) {
      event.deferred.reject(error);
    }
  }

  private static async onGetLogStatsEvent(event: GetLogStatsEvent): Promise<void> {
    try {
      const url = event.source
        ? `${LocalApiEndpoint.Logs.Stats}?source=${encodeURIComponent(event.source)}`
        : String(LocalApiEndpoint.Logs.Stats);
      const response = await fetch(url, { method: HttpMethod.Get });
      if (!response.ok) {
        await response.text().catch(() => undefined);
        event.deferred.reject(new Error(`Get log stats failed: ${response.status}`));
        return;
      }
      const data = await response.json();
      event.deferred.resolve(data);
    } catch (error) {
      event.deferred.reject(error);
    }
  }

  private static async onClearLogsEvent(event: ClearLogsEvent): Promise<void> {
    try {
      const response = await fetch(LocalApiEndpoint.Logs.Clear, { method: HttpMethod.Delete });
      if (!response.ok) {
        await response.text().catch(() => undefined);
        event.deferred.reject(new Error(`Clear logs failed: ${response.status}`));
        return;
      }
      await response.text().catch(() => undefined);
      event.deferred.resolve(OperationResult.success(undefined));
    } catch (error) {
      event.deferred.reject(error);
    }
  }

  async getResource(request: ResourceRequest): Promise<Response> {
    const storageConfig = getStorageConfig();
    const base = storageConfig.assetsPublicUrl?.replace(/\/$/, '');
    const shouldUseDesktopGuidCache =
      !this.isDev &&
      storageConfig.assetTarget?.key !== MainAppAssetTarget.LocalDev;
    logInfo('[ASSET-FLOW] getResource called', { data: { request, hasBase: !!base } }, LOG_ASSET_FLOW);

    const resolvedRequest = await resolvePlatformAssetRequest(request);

    if (base && (resolvedRequest.guid || resolvedRequest.hash || resolvedRequest.checksum)) {
      const key = resolvedRequest.guid ?? resolvedRequest.hash ?? resolvedRequest.checksum ?? '';
      const url = `${base}/${encodeURIComponent(key)}`;
      logInfo('[ASSET-FLOW] fetching asset URL', { data: { url } }, LOG_ASSET_FLOW);
      const runtime = getPlatformAssetRuntime();
      const response = resolvedRequest.guid
        ? await runtime.getAssetByGuid(resolvedRequest.guid, storageConfig, {
            useGuidCache: shouldUseDesktopGuidCache,
          })
        : resolvedRequest.hash
          ? await runtime.getAssetByHash(resolvedRequest.hash, storageConfig)
          : await runtime.getAssetByChecksum(resolvedRequest.checksum!, storageConfig);
      logInfo(
        '[RESOURCE] fetched from public URL',
        {
          data: {
            keyType: resolvedRequest.guid ? 'guid' : resolvedRequest.hash ? 'hash' : 'checksum',
            key: key.slice(0, 36),
            ok: response.ok,
            status: response.status,
          },
        },
        LOG_RESOURCE_RESPONSES
      );

      return response;
    }

    logWarn('[ASSET-FLOW] getResource cannot proceed: no base URL and no identifier', { data: { request: resolvedRequest } }, true);
    throw new Error(
      `Cannot fetch resource: assetsPublicUrl is empty and request has no guid/hash/checksum. ` +
      `Set VITE_ASSETS_PUBLIC_URL or VITE_CLAIM_STORAGE_URL.`
    );
  }

  async batchGetResources(guids: string[]): Promise<Map<string, ArrayBuffer>> {
    const storageConfig = getStorageConfig();
    const base = storageConfig.assetsPublicUrl?.replace(/\/$/, '');
    if (!base) {
      throw new Error('Cannot batch fetch: assetsPublicUrl is empty. Set VITE_ASSETS_PUBLIC_URL or VITE_CLAIM_STORAGE_URL.');
    }

    return await getPlatformAssetRuntime().batchFetchAssets(guids, storageConfig, {
      useGuidCache: !this.isDev && storageConfig.assetTarget?.key !== MainAppAssetTarget.LocalDev,
    });
  }
}
