import 'reflect-metadata';
import { createAssetGuid } from '@/AssetCreation';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableSingleton } from '@ocentra/asset-domain/ScriptableSingleton';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AssetTypeCategory, type AssetCategory } from '@ocentra/asset-domain/constants/assets';
import { normalizeAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { GameMode } from '@/gameMode/core/GameMode';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { MarkAssetDirtyEvent } from '@ocentra/eventing-domain/events/assets/MarkAssetDirtyEvent';
import { MarkAssetCleanEvent } from '@ocentra/eventing-domain/events/assets/MarkAssetCleanEvent';
import { GetDirtyAssetsEvent } from '@ocentra/eventing-domain/events/assets/GetDirtyAssetsEvent';
import { ClearDirtyAssetsEvent } from '@ocentra/eventing-domain/events/assets/ClearDirtyAssetsEvent';
import { GetMetadataEvent } from '@ocentra/eventing-domain/events/assets/GetMetadataEvent';
import { BatchUpdateMetadataEvent } from '@ocentra/eventing-domain/events/assets/BatchUpdateMetadataEvent';
import { RegisterIResourceEntryEvent } from '@ocentra/eventing-domain/events/assets/RegisterResourceEntryEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import type { IAssetRegistryHandler } from '@ocentra/eventing-domain/interfaces/IEventHandler';
import { AssetRegistryHandlerMarker } from '@ocentra/eventing-domain/interfaces/IEventHandler';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { Timestamp } from '@ocentra/asset-domain/core/Timestamp';
import { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import { ResourceEntrySerializer } from '@ocentra/asset-domain/serialization/ResourceEntrySerializer';
import type { GameId, AssetGUIDType, AssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import type { MimeType } from '@ocentra/asset-domain/constants/assets';
import { tryGameId, isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import { RegisterGuidEvent } from '@ocentra/eventing-domain/events/assets/RegisterGuidEvent';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { SetCloudLastModifiedEvent } from '@ocentra/eventing-domain/events/assets/SetCloudLastModifiedEvent';
import { GetCloudLastModifiedEvent } from '@ocentra/eventing-domain/events/assets/GetCloudLastModifiedEvent';
import { SetLastSyncFromCloudEvent } from '@ocentra/eventing-domain/events/assets/SetLastSyncFromCloudEvent';
import { SetLastSyncToCloudEvent } from '@ocentra/eventing-domain/events/assets/SetLastSyncToCloudEvent';
import { SaveAssetRegistryEvent } from '@ocentra/eventing-domain/events/assets/SaveAssetRegistryEvent';
import { GetSyncMetadataEvent } from '@ocentra/eventing-domain/events/assets/GetSyncMetadataEvent';
import { GetAssetRegistryResourcesEvent } from '@ocentra/eventing-domain/events/assets/GetAssetRegistryResourcesEvent';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { GetAssetsByGameIdEvent } from '@ocentra/eventing-domain/events/assets/GetAssetsByGameIdEvent';
import { GetImagesByGameIdEvent } from '@ocentra/eventing-domain/events/assets/GetImagesByGameIdEvent';
import { FindAssetByTypeAndNameEvent } from '@ocentra/eventing-domain/events/assets/FindAssetByTypeAndNameEvent';
import { ReplaceAllResourcesEvent } from '@ocentra/eventing-domain/events/assets/ReplaceAllResourcesEvent';
import { GetResourceByHashEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByHashEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { GetAssetRegistryGuidEvent } from '@ocentra/eventing-domain/events/assets/GetAssetRegistryGuidEvent';
import { ResourceRegisteredEvent } from '@ocentra/eventing-domain/events/assets/ResourceRegisteredEvent';
import { UpdateGameRegistryViewEvent } from '@ocentra/eventing-domain/events/game/UpdateGameRegistryViewEvent';
import type { AssetEntry } from '@ocentra/network-domain/router-types';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const BATCH_KEY_ASSET_REGISTRY_REGISTER = 'AssetRegistry.register';

log.registerBatchContext(BATCH_KEY_ASSET_REGISTRY_REGISTER, {
  enabled: true,
  batchSize: 100,
  flushInterval: 2000,
});

@serializableClass({
  schemaVersion: 1,
  assetType: 'AssetRegistry',
  displayName: 'Asset Registry',
  icon: '📋',
  category: AssetTypeCategory.Content,
})
export class AssetRegistry extends ScriptableSingleton implements IAssetRegistryHandler {
  static override schemaVersion = 1;
  static readonly HANDLER_MARKER = AssetRegistryHandlerMarker;
  
  get HANDLER_MARKER(): typeof AssetRegistryHandlerMarker {
    return AssetRegistryHandlerMarker;
  }
  static override executionOrder = -100;
  static readonly requiresInspector = true;
  private static cachedInstance: AssetRegistry | null = null;

  static override createTemplate(): Record<string, unknown> {
    return {
      resources: [],
      totalAssets: 0,
      version: 1,
      dirtyAssets: [],
    };
  }

  protected static override isInitializing: boolean = false;

  static {
    AssetRegistry.registerSingleton(AssetRegistry);
    AssetRegistry.setupEventSubscription();
  }

  private static eventRegistrar: EventRegistrar | null = null;

  get eventRegistrar(): EventRegistrar {
    if (!AssetRegistry.eventRegistrar) {
      AssetRegistry.setupEventSubscription();
    }
    return AssetRegistry.eventRegistrar!;
  }

  subscribeToEvents(): void {
    AssetRegistry.setupEventSubscription();
  }

  unsubscribeFromEvents(): void {
    if (AssetRegistry.eventRegistrar) {
      AssetRegistry.eventRegistrar.unsubscribeAll();
      AssetRegistry.eventRegistrar = null;
    }
  }

  @serializable({ label: 'Resources', immutable: true })
  resources: ResourceEntry[] = [];

  @serializable({ label: 'Last Sync From Cloud', group: 'Metadata' })
  lastSyncFromCloud: Timestamp | null = null;

  @serializable({ label: 'Last Sync To Cloud', group: 'Metadata' })
  lastSyncToCloud: Timestamp | null = null;

  @serializable({ label: 'Total Assets', group: 'Metadata' })
  totalAssets: number = 0;

  @serializable({ label: 'Last Generated', group: 'Metadata' })
  lastGenerated: Timestamp = Timestamp.now();

  @serializable({ label: 'Version', group: 'Metadata' })
  version: number = 1;

  @serializable({ label: 'Last Scan Timestamp', group: 'Metadata' })
  lastScanTimestamp: Timestamp | null = null;

  @serializable({ label: 'Dirty Assets', group: 'Metadata' })
  dirtyAssets: string[] = [];

  @serializable({ label: 'Cloud Last Modified Cache', group: 'Metadata' })
  cloudLastModifiedCacheData: Record<string, string> = {};

  private resourceEntryMap: Map<string, ResourceEntry> = new Map();
  private cloudLastModifiedCache: Map<string, Timestamp> = new Map();
  private hasDataChanged: boolean = false;
  private isSavingAssetRegistry: boolean = false;
  private lastSerializedData: string | null = null;
  private debouncedSavePromise: Promise<void> | null = null;
  private debounceResolve: (() => void) | null = null;
  private debounceReject: ((error: Error) => void) | null = null;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 500;
  private readonly MAX_SAVE_RETRIES = 3;

  constructor() {
    super();
  }

  private static setupEventSubscription(): void {
    if (this.eventRegistrar) {
      return;
    }

    this.eventRegistrar = new EventRegistrar();

    // Bind methods to preserve 'this' context when called as event handlers
    this.eventRegistrar.subscribeAsync(RegisterGuidEvent, this.onRegisterGuidEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GenerateUniqueGuidEvent, this.onGenerateUniqueGuidEvent.bind(this));
    this.eventRegistrar.subscribeAsync(SetCloudLastModifiedEvent, this.onSetCloudLastModifiedEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetCloudLastModifiedEvent, this.onGetCloudLastModifiedEvent.bind(this));
    this.eventRegistrar.subscribeAsync(SetLastSyncFromCloudEvent, this.onSetLastSyncFromCloudEvent.bind(this));
    this.eventRegistrar.subscribeAsync(SetLastSyncToCloudEvent, this.onSetLastSyncToCloudEvent.bind(this));
    this.eventRegistrar.subscribeAsync(SaveAssetRegistryEvent, this.onSaveAssetRegistryEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetSyncMetadataEvent, this.onGetSyncMetadataEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetMetadataEvent, this.onGetMetadataEvent.bind(this));
    this.eventRegistrar.subscribeAsync(MarkAssetDirtyEvent, this.onMarkAssetDirtyEvent.bind(this));
    this.eventRegistrar.subscribeAsync(MarkAssetCleanEvent, this.onMarkAssetCleanEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetDirtyAssetsEvent, this.onGetDirtyAssetsEvent.bind(this));
    this.eventRegistrar.subscribeAsync(ClearDirtyAssetsEvent, this.onClearDirtyAssetsEvent.bind(this));
    this.eventRegistrar.subscribeAsync(BatchUpdateMetadataEvent, this.onBatchUpdateMetadataEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetAssetRegistryResourcesEvent, this.onGetAssetRegistryResourcesEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetGameModeEntriesEvent, this.onGetGameModeEntriesEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetAssetsByGameIdEvent, this.onGetAssetsByGameIdEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetImagesByGameIdEvent, this.onGetImagesByGameIdEvent.bind(this));
    this.eventRegistrar.subscribeAsync(FindAssetByTypeAndNameEvent, this.onFindAssetByTypeAndNameEvent.bind(this));
    this.eventRegistrar.subscribeAsync(ReplaceAllResourcesEvent, this.onReplaceAllResourcesEvent.bind(this));
    this.eventRegistrar.subscribeAsync(RegisterIResourceEntryEvent, this.onRegisterResourceEntryEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetResourceByHashEvent, this.onGetResourceByHashEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetResourceByGuidEvent, this.onGetResourceByGuidEvent.bind(this));
    this.eventRegistrar.subscribeAsync(GetAssetRegistryGuidEvent, this.onGetAssetRegistryGuidEvent.bind(this));

  }

  private static async onRegisterGuidEvent(event: RegisterGuidEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const assetRegistryGuid = instance.guid.toString();
      if (event.guid === assetRegistryGuid) {
        if (!event.deferred.isSettled()) {
          event.deferred.resolve(OperationResult.success(true));
        }
        return;
      }
      instance.register(event.guid, event.type, event.displayName, event.gameId ?? null, event.category, event.path, event.variant);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(true));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to register GUID';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetAssetRegistryResourcesEvent(event: GetAssetRegistryResourcesEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.ensureResourcesArray();
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(instance.resources || []));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get asset registry resources';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetGameModeEntriesEvent(event: GetGameModeEntriesEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const gameModeEntries = await instance.getGameModeEntries();
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(gameModeEntries));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get game mode entries';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetAssetsByGameIdEvent(event: GetAssetsByGameIdEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const guids = instance._getAssetsByGameId(event.gameId);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(guids));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get assets by game ID';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetImagesByGameIdEvent(event: GetImagesByGameIdEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const hashes = instance._getImagesByGameId(event.gameId);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(hashes));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get images by game ID';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onFindAssetByTypeAndNameEvent(event: FindAssetByTypeAndNameEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.ensureResourcesArray();
      
      let found: AssetResourceEntry | null = null;
      
      for (const resource of instance.resources || []) {
        if (!(resource instanceof AssetResourceEntry)) {
          continue;
        }

        let matchesIdentifier = false;

        if (event.variant) {
          matchesIdentifier = resource.variant === event.variant;
        } else if (event.displayName) {
          matchesIdentifier = resource.displayName === event.displayName;
        }

        if (matchesIdentifier) {
          const normalizedEventType = normalizeAssetType(event.assetType);
          const normalizedResourceType = normalizeAssetType(resource.assetType);
          
          if (resource.inheritanceChain && Array.isArray(resource.inheritanceChain)) {
            if (resource.inheritanceChain.includes(normalizedEventType)) {
              found = resource;
              break;
            }
          } else if (normalizedResourceType === normalizedEventType) {
            found = resource;
            break;
          }
        }
      }
      
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(found));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to find asset by type and name';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGenerateUniqueGuidEvent(event: GenerateUniqueGuidEvent): Promise<void> {
    if ('targetHandler' in event && event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const result = instance.generateUniqueGuid();
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(result));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to generate GUID';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }


  private static async onSetCloudLastModifiedEvent(event: SetCloudLastModifiedEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.setCloudLastModified(event.guid, event.cloudTimestamp);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(true));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to set cloud last modified';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetCloudLastModifiedEvent(event: GetCloudLastModifiedEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const timestamp = instance.getCloudLastModified(event.guid);
      const result = timestamp?.toISOString() ?? null;
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(result));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get cloud last modified';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onSetLastSyncFromCloudEvent(event: SetLastSyncFromCloudEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.setLastSyncFromCloud(event.syncTimestamp);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(true));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to set last sync from cloud';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onSetLastSyncToCloudEvent(event: SetLastSyncToCloudEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.setLastSyncToCloud(event.syncTimestamp);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(true));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to set last sync to cloud';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onSaveAssetRegistryEvent(event: SaveAssetRegistryEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      await instance.saveAssetRegistry();
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(true));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to save asset registry';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onRegisterResourceEntryEvent(event: RegisterIResourceEntryEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.registerResourceEntry(event.entry);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(true));
      }
      await EventBus.instance.publishAsync(new ResourceRegisteredEvent(event.entry));
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to register resource entry';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onReplaceAllResourcesEvent(event: ReplaceAllResourcesEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.replaceAllResources(event.entries);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(true));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to replace all resources';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetResourceByHashEvent(event: GetResourceByHashEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const found = instance.resources.find(r => {
        if (r instanceof ImageResourceEntry) {
          return r.hash === event.hash;
        }
        if (r && typeof r === 'object' && 'hash' in r) {
          const objHash = (r as { hash?: string | null }).hash;
          return objHash === event.hash;
        }
        return false;
      }) || null;
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(found));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get resource by hash';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetResourceByGuidEvent(event: GetResourceByGuidEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const found = instance.resources.find(r =>
        r instanceof AssetResourceEntry && r.guid === event.guid
      ) || null;
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(found));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get resource by GUID';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetAssetRegistryGuidEvent(event: GetAssetRegistryGuidEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(instance.guid.toString()));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get asset registry GUID';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetMetadataEvent(event: GetMetadataEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const meta = instance.getMetadata(event.guid);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(meta || null));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get metadata';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onBatchUpdateMetadataEvent(event: BatchUpdateMetadataEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.batchUpdateMetadataMap(event.metadataMap as Map<string, ResourceEntry>);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(true));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to batch update metadata';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onGetSyncMetadataEvent(event: GetSyncMetadataEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      const result = {
        lastSyncFromCloud: instance.lastSyncFromCloud?.toISOString() ?? null,
        lastSyncToCloud: instance.lastSyncToCloud?.toISOString() ?? null,
        totalAssets: instance.totalAssets,
      };
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(result));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get sync metadata';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onMarkAssetDirtyEvent(event: MarkAssetDirtyEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      if (event.guid === instance.guid.toString() && AssetRegistry.isInitializing) {
        return;
      }
      if (!Array.isArray(instance.dirtyAssets)) {
        instance.dirtyAssets = [];
      }
      if (!instance.dirtyAssets.includes(event.guid)) {
        instance.dirtyAssets.push(event.guid);
      }
    } catch (error) {
      log.logError('[AssetRegistry] Failed to mark asset as dirty', getStackTrace(), {
        guid: event.guid,
        error,
      });
    }
  }

  private static async onMarkAssetCleanEvent(event: MarkAssetCleanEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      if (event.guid === instance.guid.toString() && AssetRegistry.isInitializing) {
        return;
      }
      if (!Array.isArray(instance.dirtyAssets)) {
        instance.dirtyAssets = [];
      }
      const index = instance.dirtyAssets.indexOf(event.guid);
      if (index !== -1) {
        instance.dirtyAssets.splice(index, 1);
      }
    } catch (error) {
      log.logError('[AssetRegistry] Failed to mark asset as clean', getStackTrace(), {
        guid: event.guid,
        error,
      });
    }
  }

  private static async onGetDirtyAssetsEvent(event: GetDirtyAssetsEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      if (!Array.isArray(instance.dirtyAssets)) {
        instance.dirtyAssets = [];
      }
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(instance.dirtyAssets));
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Failed to get dirty assets';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(failureMessage));
      }
    }
  }

  private static async onClearDirtyAssetsEvent(event: ClearDirtyAssetsEvent): Promise<void> {
    if (event.targetHandler && (event.targetHandler as unknown) !== AssetRegistryHandlerMarker) {
      return;
    }
    try {
      const instance = await AssetRegistry.getOrCreateInstance();
      instance.dirtyAssets = [];
    } catch (error) {
      log.logError('[AssetRegistry] Failed to clear dirty assets', getStackTrace(), {
        error,
      });
    }
  }


  private static getOrCreateInstance(): Promise<AssetRegistry> {
    if (AssetRegistry.cachedInstance) {
      return Promise.resolve(AssetRegistry.cachedInstance);
    }

    return AssetRegistry.getOrCreateSingletonInstance(async () => {
      AssetRegistry.isInitializing = true;
      try {
        try {
          const loaded = await ScriptableObject.FirstOrDefault(AssetRegistry);
          if (loaded) {
            loaded.ensureResourcesArray();
            loaded.initializeDefaults();

            loaded.start();
            void loaded.initializeLastSerializedData();
            void loaded.initializeGameRegistry();
            AssetRegistry.cachedInstance = loaded;
            return loaded;
          }
          } catch (error) {
            log.logError('[AssetRegistry] Failed to get existing instance', getStackTrace(), {
              error,
            });
        }

        const assetRegistry = new AssetRegistry();
        assetRegistry.initializeDefaults();

        assetRegistry.start();
        void assetRegistry.initializeLastSerializedData();
        void assetRegistry.initializeGameRegistry();

        AssetRegistry.cachedInstance = assetRegistry;
        return assetRegistry;
      } finally {
        AssetRegistry.isInitializing = false;
      }
    }).then(instance => {
      AssetRegistry.cachedInstance = instance;
      return instance;
    });
  }

  private initializeDefaults(): void {
    if (!this.displayName) {
      this.displayName = 'Asset Registry';
    }
    if (!this.treePath) {
      this.treePath = 'Resources/AssetRegistry.asset';
    }
    if (!this.resources) {
      this.resources = [];
    }
    if (this.lastSyncFromCloud === undefined) {
      this.lastSyncFromCloud = null;
    }
    if (this.lastSyncToCloud === undefined) {
      this.lastSyncToCloud = null;
    }
    if (this.totalAssets === undefined) {
      this.totalAssets = 0;
    }
    if (!this.lastGenerated) {
      this.lastGenerated = Timestamp.now();
    }
    if (this.version === undefined) {
      this.version = 1;
    }
    if (this.lastScanTimestamp === undefined) {
      this.lastScanTimestamp = null;
    }
    if (!Array.isArray(this.dirtyAssets)) {
      this.dirtyAssets = [];
    }
    if (!this.cloudLastModifiedCacheData || typeof this.cloudLastModifiedCacheData !== 'object') {
      this.cloudLastModifiedCacheData = {};
    }
    this.rebuildCloudLastModifiedCache();
  }

  protected override awake(): void {
    super.awake();
    if (!this.resources) {
      this.resources = [];
    }
    if (!this.cloudLastModifiedCacheData || typeof this.cloudLastModifiedCacheData !== 'object') {
      this.cloudLastModifiedCacheData = {};
    }
    this.rebuildMapsFromResources();
    this.rebuildCloudLastModifiedCache();
    void this.initializeGameRegistry();
  }

  protected override onStart(): void {
    super.onStart();

    if (MainAppLogger.isInitializing) {
      const checkInitEnd = setInterval(() => {
        if (!MainAppLogger.isInitializing) {
          clearInterval(checkInitEnd);
          if (this.hasDataChanged) {
            void this.scheduleSave().catch(error => {
              log.logError('[AssetRegistry] Post-init save failed', getStackTrace(), { error });
            });
          }
        }
      }, 100);
    }
  }

  private ensureResourcesArray(): void {
    if (!Array.isArray(this.resources)) {
      this.resources = [];
    } else {
      const beforeCount = this.resources.length;
      const beforeImages = this.resources.filter(item => 
        item instanceof ImageResourceEntry || (item && typeof item === 'object' && 'hash' in item && (item as { hash?: string }).hash)
      ).length;
      
      this.resources = ResourceEntrySerializer.deserializeArray(this.resources).filter(item => {
        if (!item) return false;
        if (item instanceof AssetResourceEntry || item instanceof ImageResourceEntry || item instanceof FileResourceEntry) {
          return true;
        }
        if (item && typeof item === 'object' && 'path' in item) {
          return true;
        }
        return false;
      });
      
      const afterCount = this.resources.length;
      const afterImages = this.resources.filter(item => 
        item instanceof ImageResourceEntry || (item && typeof item === 'object' && 'hash' in item && (item as { hash?: string }).hash)
      ).length;
      
      if (beforeCount !== afterCount || beforeImages !== afterImages) {
        log.logWarn('[AssetRegistry] ensureResourcesArray changed resource counts', getStackTrace(), {
          beforeCount,
          afterCount,
          beforeImages,
          afterImages,
          lostImages: beforeImages - afterImages,
        });
      }
    }
  }


  private rebuildMapsFromResources(): void {
    if (!Array.isArray(this.resources)) {
      return;
    }

    this.resourceEntryMap.clear();

    for (const item of this.resources) {
      if (!item) continue;

      const isAsset = item instanceof AssetResourceEntry || (item && 'guid' in item && 'type' in item);

      if (isAsset) {
        const entry = item as AssetResourceEntry;
        const guid = entry.guid;
        if (guid) {
          this.resourceEntryMap.set(guid, entry);
        }
      }
    }
  }

  private rebuildCloudLastModifiedCache(): void {
    this.cloudLastModifiedCache.clear();
    if (this.cloudLastModifiedCacheData && typeof this.cloudLastModifiedCacheData === 'object') {
      for (const [guid, timestampString] of Object.entries(this.cloudLastModifiedCacheData)) {
        const timestamp = Timestamp.tryFrom(timestampString);
        if (timestamp) {
          this.cloudLastModifiedCache.set(guid, timestamp);
        }
      }
    }
  }

  private async getGameModeEntries(): Promise<AssetResourceEntry<GameMode>[]> {
    this.ensureResourcesArray();
    const assetEntries = this.resources.filter((r): r is AssetResourceEntry<GameMode> => r instanceof AssetResourceEntry);
    
    return assetEntries.filter(entry => this.isGameModeEntry(entry));
  }

  private isGameModeEntry(entry: AssetResourceEntry<GameMode>): boolean {
    if (!entry.assetType) {
      return false;
    }
    
    const normalizedType = normalizeAssetType(entry.assetType);

    if (entry.inheritanceChain && Array.isArray(entry.inheritanceChain)) {
      return entry.inheritanceChain.includes('GameMode') || normalizedType.endsWith('GameMode');
    }

    return normalizedType.endsWith('GameMode');
  }

  private async initializeGameRegistry(): Promise<void> {
    try {
      const gameModeEntries = await this.getGameModeEntries();
      const updateViewDeferred = new OperationDeferred<boolean>();
      await EventBus.instance.publishAsync(new UpdateGameRegistryViewEvent(gameModeEntries, updateViewDeferred));
      await updateViewDeferred.promise;
    } catch (error) {
      log.logError('[AssetRegistry] Failed to initialize GameRegistry', getStackTrace(), { data: error });
    }
  }

  private async checkIfDataChanged(): Promise<boolean> {
    try {
      const markdownContent = this.serialize();

      if (this.lastSerializedData === markdownContent) {
        return false;
      }

      this.lastSerializedData = markdownContent;
      return true;
    } catch {
      return true;
    }
  }

  private async initializeLastSerializedData(): Promise<void> {
    try {
      const markdownContent = this.serialize();
      this.lastSerializedData = markdownContent;
    } catch {
      this.lastSerializedData = null;
    }
  }

  private async scheduleSave(): Promise<void> {
    if (MainAppLogger.isInitializing) {
      this.hasDataChanged = true;
      return;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    if (this.debouncedSavePromise) {
      return this.debouncedSavePromise;
    }

    this.debouncedSavePromise = new Promise<void>((resolve, reject) => {
      this.debounceResolve = resolve;
      this.debounceReject = reject;

      this.debounceTimeout = setTimeout(async () => {
        this.debounceTimeout = null;
        try {
          await this.executeSaveWithRetry();
          if (this.debounceResolve) {
            this.debounceResolve();
          }
        } catch (error) {
          const saveError = error instanceof Error ? error : new Error(String(error));
          log.logError('[AssetRegistry] Save failed after retries', getStackTrace(), { error: saveError });
          if (this.debounceReject) {
            this.debounceReject(saveError);
          }
        } finally {
          this.debouncedSavePromise = null;
          this.debounceResolve = null;
          this.debounceReject = null;
        }
      }, this.SAVE_DEBOUNCE_MS);
    });

    return this.debouncedSavePromise;
  }

  private async executeSaveWithRetry(): Promise<void> {
    if (this.isSavingAssetRegistry) {
      return;
    }

    if (!this.hasDataChanged) {
      return;
    }

    const hasChanged = await this.checkIfDataChanged();
    if (!hasChanged) {
      this.hasDataChanged = false;
      return;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.MAX_SAVE_RETRIES; attempt++) {
      try {
        this.hasDataChanged = false;
        await this.saveChanges();
        if (attempt > 1) {
          log.logInfo('[AssetRegistry] Save succeeded after retry', getStackTrace(), { attempt });
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.MAX_SAVE_RETRIES) {
          const delayMs = attempt * 100;
          log.logWarn('[AssetRegistry] Save attempt failed, retrying', getStackTrace(), {
            attempt,
            maxRetries: this.MAX_SAVE_RETRIES,
            delayMs,
            error: lastError,
          });
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          log.logError('[AssetRegistry] Save failed after all retries', getStackTrace(), {
            attempts: this.MAX_SAVE_RETRIES,
            error: lastError,
          });
  }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  private register(guid: string | AssetGUID, type?: string, displayName?: string, gameId?: string | null, category?: string, path?: string, variant?: string): void {
    const guidString = this.toGuidString(guid);

    if (!guidString) {
      return;
    }

    if (type === 'folder') {
      return;
    }

    if (!type || type === '' || type === 'Unknown') {
      return;
    }

    const assetType = asAssetType(type);
    const guidValue = (isAssetGUID(guidString) ? guidString : guidString as AssetGUIDType);
    const entry = new AssetResourceEntry(assetType, guidValue);
    entry.displayName = displayName || '';
    entry.gameId = gameId ? (tryGameId(gameId) ?? (gameId as GameId)) : null;
    entry.category = category ? (category as AssetCategory) : null;
    entry.path = path || '';
    entry.variant = variant || null;

    this.registerResourceEntry(entry);
  }

  private replaceAllResources(entries: IResourceEntry[]): void {
    this.ensureResourcesArray();
    this.resources = entries.map(e => this.toResourceEntry(e));
    this.rebuildMapsFromResources();
    this.hasDataChanged = true;
    void this.scheduleSave().catch(error => {
      log.logError('[AssetRegistry] Scheduled save failed', getStackTrace(), { error });
    });
  }

  private toResourceEntry(entry: IResourceEntry): ResourceEntry {
    if (entry instanceof ResourceEntry) {
      return entry;
    }
    const r = new ResourceEntry();
    r.path = entry.path;
    r.displayName = entry.displayName;
    r.gameId = entry.gameId ?? undefined;
    r.category = entry.category ?? undefined;
    r.mimeType = entry.mimeType != null ? (entry.mimeType as MimeType) : undefined;
    r.fileSize = entry.fileSize ?? undefined;
    r.checksum = entry.checksum != null ? (entry.checksum as AssetChecksum) : undefined;
    if (entry.createdAt && typeof entry.createdAt === 'object' && 'seconds' in entry.createdAt) {
      r.createdAt = Timestamp.fromJSON(entry.createdAt);
    }
    if (entry.updatedAt && typeof entry.updatedAt === 'object' && 'seconds' in entry.updatedAt) {
      r.updatedAt = Timestamp.fromJSON(entry.updatedAt);
    }
    if (entry.lastScanAt && typeof entry.lastScanAt === 'object' && 'seconds' in entry.lastScanAt) {
      r.lastScanAt = Timestamp.fromJSON(entry.lastScanAt);
    }
    return r;
  }

  private registerResourceEntry(entry: IResourceEntry): void {
    const re = this.toResourceEntry(entry);
    this.ensureResourcesArray();

    if (re instanceof AssetResourceEntry && re.guid && re.guid === this.guid.toString()) {
      return;
    }

    let existingIndex = -1;
    let identifier: string | null | undefined = null;

    const isAssetInstance = re instanceof AssetResourceEntry;
    const isImageInstance = re instanceof ImageResourceEntry;
    const isFileInstance = re instanceof FileResourceEntry;

    const hasGuid = re && 'guid' in re && (re as { guid?: string | null }).guid;
    const hasHash = re && 'hash' in re && (re as { hash?: string | null }).hash;
    const hasChecksum = re && 'checksum' in re && (re as { checksum?: string | null }).checksum;
    const assetTypeValue = (re as { assetType?: string | null; type?: string | null }).assetType ?? (re as { type?: string | null }).type;
    const hasAssetType = re && ('assetType' in re || 'type' in re) && assetTypeValue && assetTypeValue !== '';
    const isAssetPath = re.path && re.path.endsWith('.asset');

    const isAsset = isAssetInstance || (!isImageInstance && !isFileInstance && (hasGuid || hasAssetType || isAssetPath));
    const isImage = isImageInstance || (!isAssetInstance && !isFileInstance && hasHash);
    const isFile = isFileInstance || (!isAssetInstance && !isImageInstance && hasChecksum && !hasGuid && !hasAssetType && !isAssetPath);

    if (isAsset) {
      identifier = (re as AssetResourceEntry).guid ?? null;
      if (!identifier) {
        return;
      }
      existingIndex = this.resources.findIndex(item => {
        if (item instanceof AssetResourceEntry) {
          return (item as AssetResourceEntry).guid === identifier;
        }
        if (item && typeof item === 'object' && 'guid' in item) {
          const itemGuid = (item as { guid?: string | null }).guid;
          return itemGuid && itemGuid === identifier;
        }
        return false;
      });
    } else if (isImage) {
      identifier = (re as ImageResourceEntry).hash ?? null;
      if (!identifier) {
        log.logWarn('[AssetRegistry] Image entry missing hash, skipping registration', getStackTrace(), {
          path: re.path,
          displayName: re.displayName,
          hash: (re as ImageResourceEntry).hash,
        });
        return;
      }
      existingIndex = this.resources.findIndex(item => {
        if (item instanceof ImageResourceEntry) {
          return (item as ImageResourceEntry).hash === identifier;
        }
        if (item && typeof item === 'object' && 'hash' in item) {
          const itemHash = (item as { hash?: string | null }).hash;
          return itemHash && itemHash === identifier;
        }
        return false;
      });
    } else if (isFile) {
      identifier = (re as FileResourceEntry).checksum ?? null;
      if (!identifier) {
        return;
      }
      existingIndex = this.resources.findIndex(item => {
        if (item instanceof FileResourceEntry) {
          return (item as FileResourceEntry).checksum === identifier;
        }
        if (item && typeof item === 'object' && 'checksum' in item) {
          const itemChecksum = (item as { checksum?: string | null }).checksum;
          return itemChecksum && itemChecksum === identifier;
        }
        return false;
      });
    }

    if (!identifier) {
      return;
    }

    if (existingIndex >= 0) {
      this.resources[existingIndex] = re;
      if (isImage) {
        log.logInfo('[AssetRegistry] Updated existing image entry', getStackTrace(), {
          path: re.path,
          hash: (re as ImageResourceEntry).hash,
          index: existingIndex,
          totalResources: this.resources.length,
        });
      }
    } else {
      this.resources.push(re);
      if (isImage) {
        log.logInfo('[AssetRegistry] Added new image entry', getStackTrace(), {
          path: re.path,
          hash: (re as ImageResourceEntry).hash,
          totalResources: this.resources.length,
        });
      }
    }

    void this.scheduleSave().catch(error => {
      log.logError('[AssetRegistry] Scheduled save failed', getStackTrace(), { error });
    });
  }

  private generateUniqueGuid(maxAttempts: number = 100): AssetGUIDType {
    this.ensureResourcesArray();
    let attempts = 0;
    let guid: AssetGUIDType;

    do {
      guid = createAssetGuid();
      attempts++;

      if (attempts >= maxAttempts) {
        break;
      }
    } while (this.resources && this.resources.some(item => {
      if (item instanceof AssetResourceEntry) {
        return item.guid === guid;
      }
      return false;
    }));

    return guid;
  }

  private _getAssetsByGameId(gameId: string): Set<string> {
    const result = new Set<string>();
    for (const [guid, entry] of this.resourceEntryMap.entries()) {
      if (entry instanceof AssetResourceEntry && entry.gameId === gameId) {
        result.add(guid);
      }
    }
    return result;
  }

  private _getImagesByGameId(gameId: string): Set<string> {
    this.ensureResourcesArray();
    const result = new Set<string>();
    for (const item of this.resources) {
      if (item instanceof ImageResourceEntry && item.gameId === gameId && item.hash) {
        result.add(item.hash);
      }
    }
    return result;
  }

  private getMetadata(guid: string | AssetGUID): ResourceEntry | undefined {
    this.ensureResourcesArray();
    const guidString = this.toGuidString(guid);
    return this.resourceEntryMap.get(guidString);
  }

  private batchUpdateMetadataMap(resources: Map<string, ResourceEntry>): void {
    for (const [, resource] of resources.entries()) {
      if (resource && resource instanceof AssetResourceEntry && resource.guid) {
        this.resourceEntryMap.set(resource.guid, resource);
      }
    }
  }

  private async saveAssetRegistry(): Promise<void> {
    const saveStart = performance.now();
    log.logInfo('[AssetRegistry] saveAssetRegistry START', getStackTrace());

    if (this.isSavingAssetRegistry) {
      log.logWarn('[AssetRegistry] Save already in progress, skipping', getStackTrace());
      return;
    }

    this.isSavingAssetRegistry = true;

    if (!this.hasDataChanged) {
      this.isSavingAssetRegistry = false;
      return;
    }
    try {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = null;
      }
      if (this.debouncedSavePromise) {
        if (this.debounceResolve) {
          this.debounceResolve();
        }
        this.debouncedSavePromise = null;
        this.debounceResolve = null;
        this.debounceReject = null;
      }
      this.ensureResourcesArray();
      this.hasDataChanged = false;
      this.totalAssets = this.resources ? this.resources.length : 0;
      this.lastGenerated = Timestamp.now();
      this.version = 1;

      const originalResources = this.resources;
      
      const resourceCounts = {
        total: originalResources?.length || 0,
        assets: 0,
        images: 0,
        files: 0,
      };
      
      const serializedResources: Record<string, unknown>[] = Array.isArray(originalResources) 
        ? originalResources.map(entry => {
            const isAssetInstance = entry instanceof AssetResourceEntry;
            const isImageInstance = entry instanceof ImageResourceEntry;
            const isFileInstance = entry instanceof FileResourceEntry;
            
            const hasGuid = entry && 'guid' in entry && (entry as { guid?: string | null }).guid;
            const hasHash = entry && 'hash' in entry && (entry as { hash?: string | null }).hash;
            const assetTypeValue = (entry as { assetType?: string | null; type?: string | null }).assetType ?? (entry as { type?: string | null }).type;
            const hasAssetType = entry && ('assetType' in entry || 'type' in entry) && assetTypeValue && assetTypeValue !== '';
            const isAssetPath = entry && entry.path && entry.path.endsWith('.asset');
            
            const isAsset = isAssetInstance || (!isImageInstance && !isFileInstance && (hasGuid || hasAssetType || isAssetPath));
            const isImage = isImageInstance || (!isAssetInstance && !isFileInstance && hasHash);
            
            if (isAsset) resourceCounts.assets++;
            else if (isImage) resourceCounts.images++;
            else resourceCounts.files++;
            return ResourceEntrySerializer.serialize(entry);
          })
        : [];
      
      log.logInfo('[AssetRegistry] Saving asset registry with resources', getStackTrace(), {
        totalResources: resourceCounts.total,
        assets: resourceCounts.assets,
        images: resourceCounts.images,
        files: resourceCounts.files,
      });
      
      this.resources = serializedResources as unknown as ResourceEntry[];
      

      try {
        const json5Content = this.serialize();

        const fileSize = json5Content.length;

      try {
        const uploadDeferred = new OperationDeferred<AssetEntry>();
        await EventBus.instance.publishAsync(new UploadAssetEvent(
          this.guid.toString(),
          json5Content,
          {
            assetType: 'AssetRegistry',
            displayName: 'Asset Registry',
            category: 'Content',
            mimeType: 'application/json',
            fileSize
          },
          uploadDeferred
        ));
        const uploadResult = await uploadDeferred.promise;
          if (!uploadResult.isSuccess) {
            throw new Error(uploadResult.errorMessage || 'Upload failed');
          }
        } catch (error) {
          log.logError('[AssetRegistry] API save failed, falling back to saveChanges', getStackTrace(), { error });
          await this.saveChanges();
        }
      } catch (error) {
        log.logError('[AssetRegistry] Error during saveAssetRegistry', getStackTrace(), { error });
        throw error;
      }

      const saveEnd = performance.now();
      log.logInfo(`[AssetRegistry] saveAssetRegistry END (success) - ${(saveEnd - saveStart).toFixed(2)}ms`, getStackTrace());
    } catch (error) {
      const saveEnd = performance.now();
      log.logError(`[AssetRegistry] saveAssetRegistry END (error) - ${(saveEnd - saveStart).toFixed(2)}ms`, getStackTrace(), { error });
      this.isSavingAssetRegistry = false;
      throw error;
    } finally {
      this.isSavingAssetRegistry = false;
    }
  }


  private setCloudLastModified(guid: string | AssetGUID, timestamp: string | Timestamp): void {
    this.ensureResourcesArray();
    const guidString = this.toGuidString(guid);
    const timestampObj = this.toTimestamp(timestamp);

    if (!timestampObj) {
      return;
    }

    this.cloudLastModifiedCache.set(guidString, timestampObj);
    if (!this.cloudLastModifiedCacheData) {
      this.cloudLastModifiedCacheData = {};
    }
    this.cloudLastModifiedCacheData[guidString] = timestampObj.toISOString();
    this.hasDataChanged = true;
    void this.scheduleSave().catch(error => {
      log.logError('[AssetRegistry] Scheduled save failed', getStackTrace(), { error });
    });
  }

  private getCloudLastModified(guid: string | AssetGUID): Timestamp | undefined {
    this.ensureResourcesArray();
    const guidString = this.toGuidString(guid);

    return this.cloudLastModifiedCache.get(guidString);
  }

  private setLastSyncFromCloud(timestamp: string | Timestamp): void {
    this.lastSyncFromCloud = this.toTimestamp(timestamp);
  }

  private setLastSyncToCloud(timestamp: string | Timestamp): void {
    this.lastSyncToCloud = this.toTimestamp(timestamp);
  }

  private toGuidString(guid: string | AssetGUID): string {
    return guid instanceof AssetGUID ? guid.toString() : guid;
  }


  private toTimestamp(timestamp: string | Timestamp): Timestamp | null {
    return timestamp instanceof Timestamp ? timestamp : (timestamp ? Timestamp.from(timestamp) : null);
  }

}


