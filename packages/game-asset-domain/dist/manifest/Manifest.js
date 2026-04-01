var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Manifest_1;
import 'reflect-metadata';
import { createAssetGuid } from '../AssetCreation.js';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableSingleton } from '@ocentra/asset-domain/ScriptableSingleton';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { normalizeAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
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
import { ManifestHandlerMarker } from '@ocentra/eventing-domain/interfaces/IEventHandler';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { Timestamp } from '@ocentra/asset-domain/core/Timestamp';
import { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import { ResourceEntrySerializer } from '@ocentra/asset-domain/serialization/ResourceEntrySerializer';
import { tryGameId, isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import { RegisterGuidEvent } from '@ocentra/eventing-domain/events/assets/RegisterGuidEvent';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { SetCloudLastModifiedEvent } from '@ocentra/eventing-domain/events/assets/SetCloudLastModifiedEvent';
import { GetCloudLastModifiedEvent } from '@ocentra/eventing-domain/events/assets/GetCloudLastModifiedEvent';
import { SetLastSyncFromCloudEvent } from '@ocentra/eventing-domain/events/assets/SetLastSyncFromCloudEvent';
import { SetLastSyncToCloudEvent } from '@ocentra/eventing-domain/events/assets/SetLastSyncToCloudEvent';
import { SaveManifestEvent } from '@ocentra/eventing-domain/events/assets/SaveManifestEvent';
import { GetSyncMetadataEvent } from '@ocentra/eventing-domain/events/assets/GetSyncMetadataEvent';
import { GetManifestResourcesEvent } from '@ocentra/eventing-domain/events/assets/GetManifestResourcesEvent';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { GetAssetsByGameIdEvent } from '@ocentra/eventing-domain/events/assets/GetAssetsByGameIdEvent';
import { GetImagesByGameIdEvent } from '@ocentra/eventing-domain/events/assets/GetImagesByGameIdEvent';
import { FindAssetByTypeAndNameEvent } from '@ocentra/eventing-domain/events/assets/FindAssetByTypeAndNameEvent';
import { ReplaceAllResourcesEvent } from '@ocentra/eventing-domain/events/assets/ReplaceAllResourcesEvent';
import { GetResourceByHashEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByHashEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { GetManifestGuidEvent } from '@ocentra/eventing-domain/events/assets/GetManifestGuidEvent';
import { ResourceRegisteredEvent } from '@ocentra/eventing-domain/events/assets/ResourceRegisteredEvent';
import { UpdateGameRegistryViewEvent } from '@ocentra/eventing-domain/events/game/UpdateGameRegistryViewEvent';
const log = MainAppLogger.instance;
log.register(import.meta.url);
const BATCH_KEY_MANIFEST_REGISTER = 'Manifest.register';
log.registerBatchContext(BATCH_KEY_MANIFEST_REGISTER, {
    enabled: true,
    batchSize: 100,
    flushInterval: 2000,
});
let Manifest = class Manifest extends ScriptableSingleton {
    static { Manifest_1 = this; }
    static schemaVersion = 1;
    static HANDLER_MARKER = ManifestHandlerMarker;
    get HANDLER_MARKER() {
        return ManifestHandlerMarker;
    }
    static executionOrder = -100;
    static requiresInspector = true;
    static cachedInstance = null;
    static createTemplate() {
        return {
            resources: [],
            totalAssets: 0,
            version: 1,
            dirtyAssets: [],
        };
    }
    static isInitializing = false;
    static {
        Manifest_1.registerSingleton(Manifest_1);
        Manifest_1.setupEventSubscription();
    }
    static eventRegistrar = null;
    get eventRegistrar() {
        if (!Manifest_1.eventRegistrar) {
            Manifest_1.setupEventSubscription();
        }
        return Manifest_1.eventRegistrar;
    }
    subscribeToEvents() {
        Manifest_1.setupEventSubscription();
    }
    unsubscribeFromEvents() {
        if (Manifest_1.eventRegistrar) {
            Manifest_1.eventRegistrar.unsubscribeAll();
            Manifest_1.eventRegistrar = null;
        }
    }
    resources = [];
    lastSyncFromCloud = null;
    lastSyncToCloud = null;
    totalAssets = 0;
    lastGenerated = Timestamp.now();
    version = 1;
    lastScanTimestamp = null;
    dirtyAssets = [];
    cloudLastModifiedCacheData = {};
    resourceEntryMap = new Map();
    cloudLastModifiedCache = new Map();
    hasDataChanged = false;
    isSavingManifest = false;
    lastSerializedData = null;
    debouncedSavePromise = null;
    debounceResolve = null;
    debounceReject = null;
    debounceTimeout = null;
    SAVE_DEBOUNCE_MS = 500;
    MAX_SAVE_RETRIES = 3;
    constructor() {
        super();
    }
    static setupEventSubscription() {
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
        this.eventRegistrar.subscribeAsync(SaveManifestEvent, this.onSaveManifestEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetSyncMetadataEvent, this.onGetSyncMetadataEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetMetadataEvent, this.onGetMetadataEvent.bind(this));
        this.eventRegistrar.subscribeAsync(MarkAssetDirtyEvent, this.onMarkAssetDirtyEvent.bind(this));
        this.eventRegistrar.subscribeAsync(MarkAssetCleanEvent, this.onMarkAssetCleanEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetDirtyAssetsEvent, this.onGetDirtyAssetsEvent.bind(this));
        this.eventRegistrar.subscribeAsync(ClearDirtyAssetsEvent, this.onClearDirtyAssetsEvent.bind(this));
        this.eventRegistrar.subscribeAsync(BatchUpdateMetadataEvent, this.onBatchUpdateMetadataEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetManifestResourcesEvent, this.onGetManifestResourcesEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetGameModeEntriesEvent, this.onGetGameModeEntriesEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetAssetsByGameIdEvent, this.onGetAssetsByGameIdEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetImagesByGameIdEvent, this.onGetImagesByGameIdEvent.bind(this));
        this.eventRegistrar.subscribeAsync(FindAssetByTypeAndNameEvent, this.onFindAssetByTypeAndNameEvent.bind(this));
        this.eventRegistrar.subscribeAsync(ReplaceAllResourcesEvent, this.onReplaceAllResourcesEvent.bind(this));
        this.eventRegistrar.subscribeAsync(RegisterIResourceEntryEvent, this.onRegisterResourceEntryEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetResourceByHashEvent, this.onGetResourceByHashEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetResourceByGuidEvent, this.onGetResourceByGuidEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetManifestGuidEvent, this.onGetManifestGuidEvent.bind(this));
    }
    static async onRegisterGuidEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const manifestGuidString = instance.guid.toString();
            if (event.guid === manifestGuidString) {
                if (!event.deferred.isSettled()) {
                    event.deferred.resolve(OperationResult.success(true));
                }
                return;
            }
            instance.register(event.guid, event.type, event.displayName, event.gameId ?? null, event.category, event.path, event.variant);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to register GUID';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetManifestResourcesEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.ensureResourcesArray();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(instance.resources || []));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get manifest resources';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetGameModeEntriesEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const gameModeEntries = await instance.getGameModeEntries();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(gameModeEntries));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get game mode entries';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetAssetsByGameIdEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const guids = instance._getAssetsByGameId(event.gameId);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(guids));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get assets by game ID';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetImagesByGameIdEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const hashes = instance._getImagesByGameId(event.gameId);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(hashes));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get images by game ID';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onFindAssetByTypeAndNameEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.ensureResourcesArray();
            let found = null;
            for (const resource of instance.resources || []) {
                if (!(resource instanceof AssetResourceEntry)) {
                    continue;
                }
                let matchesIdentifier = false;
                if (event.variant) {
                    matchesIdentifier = resource.variant === event.variant;
                }
                else if (event.displayName) {
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
                    }
                    else if (normalizedResourceType === normalizedEventType) {
                        found = resource;
                        break;
                    }
                }
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(found));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to find asset by type and name';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGenerateUniqueGuidEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const result = instance.generateUniqueGuid();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(result));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to generate GUID';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onSetCloudLastModifiedEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.setCloudLastModified(event.guid, event.cloudTimestamp);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to set cloud last modified';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetCloudLastModifiedEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const timestamp = instance.getCloudLastModified(event.guid);
            const result = timestamp?.toISOString() ?? null;
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(result));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get cloud last modified';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onSetLastSyncFromCloudEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.setLastSyncFromCloud(event.syncTimestamp);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to set last sync from cloud';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onSetLastSyncToCloudEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.setLastSyncToCloud(event.syncTimestamp);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to set last sync to cloud';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onSaveManifestEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            await instance.saveManifest();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to save manifest';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onRegisterResourceEntryEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.registerResourceEntry(event.entry);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
            await EventBus.instance.publishAsync(new ResourceRegisteredEvent(event.entry));
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to register resource entry';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onReplaceAllResourcesEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.replaceAllResources(event.entries);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to replace all resources';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetResourceByHashEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const found = instance.resources.find(r => {
                if (r instanceof ImageResourceEntry) {
                    return r.hash === event.hash;
                }
                if (r && typeof r === 'object' && 'hash' in r) {
                    const objHash = r.hash;
                    return objHash === event.hash;
                }
                return false;
            }) || null;
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(found));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get resource by hash';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetResourceByGuidEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const found = instance.resources.find(r => r instanceof AssetResourceEntry && r.guid === event.guid) || null;
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(found));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get resource by GUID';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetManifestGuidEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(instance.guid.toString()));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get manifest GUID';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetMetadataEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const meta = instance.getMetadata(event.guid);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(meta || null));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get metadata';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onBatchUpdateMetadataEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.batchUpdateMetadataMap(event.metadataMap);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to batch update metadata';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetSyncMetadataEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            const result = {
                lastSyncFromCloud: instance.lastSyncFromCloud?.toISOString() ?? null,
                lastSyncToCloud: instance.lastSyncToCloud?.toISOString() ?? null,
                totalAssets: instance.totalAssets,
            };
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(result));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get sync metadata';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onMarkAssetDirtyEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            if (event.guid === instance.guid.toString() && Manifest_1.isInitializing) {
                return;
            }
            if (!Array.isArray(instance.dirtyAssets)) {
                instance.dirtyAssets = [];
            }
            if (!instance.dirtyAssets.includes(event.guid)) {
                instance.dirtyAssets.push(event.guid);
            }
        }
        catch (error) {
            log.logError('[Manifest] Failed to mark asset as dirty', getStackTrace(), {
                guid: event.guid,
                error,
            });
        }
    }
    static async onMarkAssetCleanEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            if (event.guid === instance.guid.toString() && Manifest_1.isInitializing) {
                return;
            }
            if (!Array.isArray(instance.dirtyAssets)) {
                instance.dirtyAssets = [];
            }
            const index = instance.dirtyAssets.indexOf(event.guid);
            if (index !== -1) {
                instance.dirtyAssets.splice(index, 1);
            }
        }
        catch (error) {
            log.logError('[Manifest] Failed to mark asset as clean', getStackTrace(), {
                guid: event.guid,
                error,
            });
        }
    }
    static async onGetDirtyAssetsEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            if (!Array.isArray(instance.dirtyAssets)) {
                instance.dirtyAssets = [];
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(instance.dirtyAssets));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get dirty assets';
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onClearDirtyAssetsEvent(event) {
        if (event.targetHandler && event.targetHandler !== ManifestHandlerMarker) {
            return;
        }
        try {
            const instance = await Manifest_1.getOrCreateInstance();
            instance.dirtyAssets = [];
        }
        catch (error) {
            log.logError('[Manifest] Failed to clear dirty assets', getStackTrace(), {
                error,
            });
        }
    }
    static getOrCreateInstance() {
        if (Manifest_1.cachedInstance) {
            return Promise.resolve(Manifest_1.cachedInstance);
        }
        return Manifest_1.getOrCreateSingletonInstance(async () => {
            Manifest_1.isInitializing = true;
            try {
                try {
                    const loaded = await ScriptableObject.FirstOrDefault(Manifest_1);
                    if (loaded) {
                        loaded.ensureResourcesArray();
                        loaded.initializeDefaults();
                        loaded.start();
                        void loaded.initializeLastSerializedData();
                        void loaded.initializeGameRegistry();
                        Manifest_1.cachedInstance = loaded;
                        return loaded;
                    }
                }
                catch (error) {
                    log.logError('[Manifest] Failed to get existing instance', getStackTrace(), {
                        error,
                    });
                }
                const manifest = new Manifest_1();
                manifest.initializeDefaults();
                manifest.start();
                void manifest.initializeLastSerializedData();
                void manifest.initializeGameRegistry();
                Manifest_1.cachedInstance = manifest;
                return manifest;
            }
            finally {
                Manifest_1.isInitializing = false;
            }
        }).then(instance => {
            Manifest_1.cachedInstance = instance;
            return instance;
        });
    }
    initializeDefaults() {
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
    awake() {
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
    onStart() {
        super.onStart();
        if (MainAppLogger.isInitializing) {
            const checkInitEnd = setInterval(() => {
                if (!MainAppLogger.isInitializing) {
                    clearInterval(checkInitEnd);
                    if (this.hasDataChanged) {
                        void this.scheduleSave().catch(error => {
                            log.logError('[Manifest] Post-init save failed', getStackTrace(), { error });
                        });
                    }
                }
            }, 100);
        }
    }
    ensureResourcesArray() {
        if (!Array.isArray(this.resources)) {
            this.resources = [];
        }
        else {
            const beforeCount = this.resources.length;
            const beforeImages = this.resources.filter(item => item instanceof ImageResourceEntry || (item && typeof item === 'object' && 'hash' in item && item.hash)).length;
            this.resources = ResourceEntrySerializer.deserializeArray(this.resources).filter(item => {
                if (!item)
                    return false;
                if (item instanceof AssetResourceEntry || item instanceof ImageResourceEntry || item instanceof FileResourceEntry) {
                    return true;
                }
                if (item && typeof item === 'object' && 'path' in item) {
                    return true;
                }
                return false;
            });
            const afterCount = this.resources.length;
            const afterImages = this.resources.filter(item => item instanceof ImageResourceEntry || (item && typeof item === 'object' && 'hash' in item && item.hash)).length;
            if (beforeCount !== afterCount || beforeImages !== afterImages) {
                log.logWarn('[Manifest] ensureResourcesArray changed resource counts', getStackTrace(), {
                    beforeCount,
                    afterCount,
                    beforeImages,
                    afterImages,
                    lostImages: beforeImages - afterImages,
                });
            }
        }
    }
    rebuildMapsFromResources() {
        if (!Array.isArray(this.resources)) {
            return;
        }
        this.resourceEntryMap.clear();
        for (const item of this.resources) {
            if (!item)
                continue;
            const isAsset = item instanceof AssetResourceEntry || (item && 'guid' in item && 'type' in item);
            if (isAsset) {
                const entry = item;
                const guid = entry.guid;
                if (guid) {
                    this.resourceEntryMap.set(guid, entry);
                }
            }
        }
    }
    rebuildCloudLastModifiedCache() {
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
    async getGameModeEntries() {
        this.ensureResourcesArray();
        const assetEntries = this.resources.filter((r) => r instanceof AssetResourceEntry);
        return assetEntries.filter(entry => this.isGameModeEntry(entry));
    }
    isGameModeEntry(entry) {
        if (!entry.assetType) {
            return false;
        }
        const normalizedType = normalizeAssetType(entry.assetType);
        if (entry.inheritanceChain && Array.isArray(entry.inheritanceChain)) {
            return entry.inheritanceChain.includes('GameMode') || normalizedType.endsWith('GameMode');
        }
        return normalizedType.endsWith('GameMode');
    }
    async initializeGameRegistry() {
        try {
            const gameModeEntries = await this.getGameModeEntries();
            const updateViewDeferred = new OperationDeferred();
            await EventBus.instance.publishAsync(new UpdateGameRegistryViewEvent(gameModeEntries, updateViewDeferred));
            await updateViewDeferred.promise;
        }
        catch (error) {
            log.logError('[Manifest] Failed to initialize GameRegistry', getStackTrace(), { data: error });
        }
    }
    async checkIfDataChanged() {
        try {
            const markdownContent = this.serialize();
            if (this.lastSerializedData === markdownContent) {
                return false;
            }
            this.lastSerializedData = markdownContent;
            return true;
        }
        catch {
            return true;
        }
    }
    async initializeLastSerializedData() {
        try {
            const markdownContent = this.serialize();
            this.lastSerializedData = markdownContent;
        }
        catch {
            this.lastSerializedData = null;
        }
    }
    async scheduleSave() {
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
        this.debouncedSavePromise = new Promise((resolve, reject) => {
            this.debounceResolve = resolve;
            this.debounceReject = reject;
            this.debounceTimeout = setTimeout(async () => {
                this.debounceTimeout = null;
                try {
                    await this.executeSaveWithRetry();
                    if (this.debounceResolve) {
                        this.debounceResolve();
                    }
                }
                catch (error) {
                    const saveError = error instanceof Error ? error : new Error(String(error));
                    log.logError('[Manifest] Save failed after retries', getStackTrace(), { error: saveError });
                    if (this.debounceReject) {
                        this.debounceReject(saveError);
                    }
                }
                finally {
                    this.debouncedSavePromise = null;
                    this.debounceResolve = null;
                    this.debounceReject = null;
                }
            }, this.SAVE_DEBOUNCE_MS);
        });
        return this.debouncedSavePromise;
    }
    async executeSaveWithRetry() {
        if (this.isSavingManifest) {
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
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_SAVE_RETRIES; attempt++) {
            try {
                this.hasDataChanged = false;
                await this.saveChanges();
                if (attempt > 1) {
                    log.logInfo('[Manifest] Save succeeded after retry', getStackTrace(), { attempt });
                }
                return;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.MAX_SAVE_RETRIES) {
                    const delayMs = attempt * 100;
                    log.logWarn('[Manifest] Save attempt failed, retrying', getStackTrace(), {
                        attempt,
                        maxRetries: this.MAX_SAVE_RETRIES,
                        delayMs,
                        error: lastError,
                    });
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
                else {
                    log.logError('[Manifest] Save failed after all retries', getStackTrace(), {
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
    register(guid, type, displayName, gameId, category, path, variant) {
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
        const guidValue = (isAssetGUID(guidString) ? guidString : guidString);
        const entry = new AssetResourceEntry(assetType, guidValue);
        entry.displayName = displayName || '';
        entry.gameId = gameId ? (tryGameId(gameId) ?? gameId) : null;
        entry.category = category ? category : null;
        entry.path = path || '';
        entry.variant = variant || null;
        this.registerResourceEntry(entry);
    }
    replaceAllResources(entries) {
        this.ensureResourcesArray();
        this.resources = entries.map(e => this.toResourceEntry(e));
        this.rebuildMapsFromResources();
        this.hasDataChanged = true;
        void this.scheduleSave().catch(error => {
            log.logError('[Manifest] Scheduled save failed', getStackTrace(), { error });
        });
    }
    toResourceEntry(entry) {
        if (entry instanceof ResourceEntry) {
            return entry;
        }
        const r = new ResourceEntry();
        r.path = entry.path;
        r.displayName = entry.displayName;
        r.gameId = entry.gameId ?? undefined;
        r.category = entry.category ?? undefined;
        r.mimeType = entry.mimeType != null ? entry.mimeType : undefined;
        r.fileSize = entry.fileSize ?? undefined;
        r.checksum = entry.checksum != null ? entry.checksum : undefined;
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
    registerResourceEntry(entry) {
        const re = this.toResourceEntry(entry);
        this.ensureResourcesArray();
        if (re instanceof AssetResourceEntry && re.guid && re.guid === this.guid.toString()) {
            return;
        }
        let existingIndex = -1;
        let identifier = null;
        const isAssetInstance = re instanceof AssetResourceEntry;
        const isImageInstance = re instanceof ImageResourceEntry;
        const isFileInstance = re instanceof FileResourceEntry;
        const hasGuid = re && 'guid' in re && re.guid;
        const hasHash = re && 'hash' in re && re.hash;
        const hasChecksum = re && 'checksum' in re && re.checksum;
        const assetTypeValue = re.assetType ?? re.type;
        const hasAssetType = re && ('assetType' in re || 'type' in re) && assetTypeValue && assetTypeValue !== '';
        const isAssetPath = re.path && re.path.endsWith('.asset');
        const isAsset = isAssetInstance || (!isImageInstance && !isFileInstance && (hasGuid || hasAssetType || isAssetPath));
        const isImage = isImageInstance || (!isAssetInstance && !isFileInstance && hasHash);
        const isFile = isFileInstance || (!isAssetInstance && !isImageInstance && hasChecksum && !hasGuid && !hasAssetType && !isAssetPath);
        if (isAsset) {
            identifier = re.guid ?? null;
            if (!identifier) {
                return;
            }
            existingIndex = this.resources.findIndex(item => {
                if (item instanceof AssetResourceEntry) {
                    return item.guid === identifier;
                }
                if (item && typeof item === 'object' && 'guid' in item) {
                    const itemGuid = item.guid;
                    return itemGuid && itemGuid === identifier;
                }
                return false;
            });
        }
        else if (isImage) {
            identifier = re.hash ?? null;
            if (!identifier) {
                log.logWarn('[Manifest] Image entry missing hash, skipping registration', getStackTrace(), {
                    path: re.path,
                    displayName: re.displayName,
                    hash: re.hash,
                });
                return;
            }
            existingIndex = this.resources.findIndex(item => {
                if (item instanceof ImageResourceEntry) {
                    return item.hash === identifier;
                }
                if (item && typeof item === 'object' && 'hash' in item) {
                    const itemHash = item.hash;
                    return itemHash && itemHash === identifier;
                }
                return false;
            });
        }
        else if (isFile) {
            identifier = re.checksum ?? null;
            if (!identifier) {
                return;
            }
            existingIndex = this.resources.findIndex(item => {
                if (item instanceof FileResourceEntry) {
                    return item.checksum === identifier;
                }
                if (item && typeof item === 'object' && 'checksum' in item) {
                    const itemChecksum = item.checksum;
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
                log.logInfo('[Manifest] Updated existing image entry', getStackTrace(), {
                    path: re.path,
                    hash: re.hash,
                    index: existingIndex,
                    totalResources: this.resources.length,
                });
            }
        }
        else {
            this.resources.push(re);
            if (isImage) {
                log.logInfo('[Manifest] Added new image entry', getStackTrace(), {
                    path: re.path,
                    hash: re.hash,
                    totalResources: this.resources.length,
                });
            }
        }
        void this.scheduleSave().catch(error => {
            log.logError('[Manifest] Scheduled save failed', getStackTrace(), { error });
        });
    }
    generateUniqueGuid(maxAttempts = 100) {
        this.ensureResourcesArray();
        let attempts = 0;
        let guid;
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
    _getAssetsByGameId(gameId) {
        const result = new Set();
        for (const [guid, entry] of this.resourceEntryMap.entries()) {
            if (entry instanceof AssetResourceEntry && entry.gameId === gameId) {
                result.add(guid);
            }
        }
        return result;
    }
    _getImagesByGameId(gameId) {
        this.ensureResourcesArray();
        const result = new Set();
        for (const item of this.resources) {
            if (item instanceof ImageResourceEntry && item.gameId === gameId && item.hash) {
                result.add(item.hash);
            }
        }
        return result;
    }
    getMetadata(guid) {
        this.ensureResourcesArray();
        const guidString = this.toGuidString(guid);
        return this.resourceEntryMap.get(guidString);
    }
    batchUpdateMetadataMap(resources) {
        for (const [, resource] of resources.entries()) {
            if (resource && resource instanceof AssetResourceEntry && resource.guid) {
                this.resourceEntryMap.set(resource.guid, resource);
            }
        }
    }
    async saveManifest() {
        const saveStart = performance.now();
        log.logInfo('[Manifest] saveManifest START', getStackTrace());
        if (this.isSavingManifest) {
            log.logWarn('[Manifest] Save already in progress, skipping', getStackTrace());
            return;
        }
        this.isSavingManifest = true;
        if (!this.hasDataChanged) {
            this.isSavingManifest = false;
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
            const serializedResources = Array.isArray(originalResources)
                ? originalResources.map(entry => {
                    const isAssetInstance = entry instanceof AssetResourceEntry;
                    const isImageInstance = entry instanceof ImageResourceEntry;
                    const isFileInstance = entry instanceof FileResourceEntry;
                    const hasGuid = entry && 'guid' in entry && entry.guid;
                    const hasHash = entry && 'hash' in entry && entry.hash;
                    const assetTypeValue = entry.assetType ?? entry.type;
                    const hasAssetType = entry && ('assetType' in entry || 'type' in entry) && assetTypeValue && assetTypeValue !== '';
                    const isAssetPath = entry && entry.path && entry.path.endsWith('.asset');
                    const isAsset = isAssetInstance || (!isImageInstance && !isFileInstance && (hasGuid || hasAssetType || isAssetPath));
                    const isImage = isImageInstance || (!isAssetInstance && !isFileInstance && hasHash);
                    if (isAsset)
                        resourceCounts.assets++;
                    else if (isImage)
                        resourceCounts.images++;
                    else
                        resourceCounts.files++;
                    return ResourceEntrySerializer.serialize(entry);
                })
                : [];
            log.logInfo('[Manifest] Saving manifest with resources', getStackTrace(), {
                totalResources: resourceCounts.total,
                assets: resourceCounts.assets,
                images: resourceCounts.images,
                files: resourceCounts.files,
            });
            this.resources = serializedResources;
            try {
                const json5Content = this.serialize();
                const fileSize = json5Content.length;
                try {
                    const uploadDeferred = new OperationDeferred();
                    await EventBus.instance.publishAsync(new UploadAssetEvent(this.guid.toString(), json5Content, {
                        assetType: 'Manifest',
                        displayName: 'Manifest',
                        category: 'Content',
                        mimeType: 'application/json',
                        fileSize
                    }, uploadDeferred));
                    const uploadResult = await uploadDeferred.promise;
                    if (!uploadResult.isSuccess) {
                        throw new Error(uploadResult.errorMessage || 'Upload failed');
                    }
                }
                catch (error) {
                    log.logError('[Manifest] API save failed, falling back to saveChanges', getStackTrace(), { error });
                    await this.saveChanges();
                }
            }
            catch (error) {
                log.logError('[Manifest] Error during saveManifest', getStackTrace(), { error });
                throw error;
            }
            const saveEnd = performance.now();
            log.logInfo(`[Manifest] saveManifest END (success) - ${(saveEnd - saveStart).toFixed(2)}ms`, getStackTrace());
        }
        catch (error) {
            const saveEnd = performance.now();
            log.logError(`[Manifest] saveManifest END (error) - ${(saveEnd - saveStart).toFixed(2)}ms`, getStackTrace(), { error });
            this.isSavingManifest = false;
            throw error;
        }
        finally {
            this.isSavingManifest = false;
        }
    }
    setCloudLastModified(guid, timestamp) {
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
            log.logError('[Manifest] Scheduled save failed', getStackTrace(), { error });
        });
    }
    getCloudLastModified(guid) {
        this.ensureResourcesArray();
        const guidString = this.toGuidString(guid);
        return this.cloudLastModifiedCache.get(guidString);
    }
    setLastSyncFromCloud(timestamp) {
        this.lastSyncFromCloud = this.toTimestamp(timestamp);
    }
    setLastSyncToCloud(timestamp) {
        this.lastSyncToCloud = this.toTimestamp(timestamp);
    }
    toGuidString(guid) {
        return guid instanceof AssetGUID ? guid.toString() : guid;
    }
    toTimestamp(timestamp) {
        return timestamp instanceof Timestamp ? timestamp : (timestamp ? Timestamp.from(timestamp) : null);
    }
};
__decorate([
    serializable({ label: 'Resources', immutable: true }),
    __metadata("design:type", Array)
], Manifest.prototype, "resources", void 0);
__decorate([
    serializable({ label: 'Last Sync From Cloud', group: 'Metadata' }),
    __metadata("design:type", Object)
], Manifest.prototype, "lastSyncFromCloud", void 0);
__decorate([
    serializable({ label: 'Last Sync To Cloud', group: 'Metadata' }),
    __metadata("design:type", Object)
], Manifest.prototype, "lastSyncToCloud", void 0);
__decorate([
    serializable({ label: 'Total Assets', group: 'Metadata' }),
    __metadata("design:type", Number)
], Manifest.prototype, "totalAssets", void 0);
__decorate([
    serializable({ label: 'Last Generated', group: 'Metadata' }),
    __metadata("design:type", Timestamp)
], Manifest.prototype, "lastGenerated", void 0);
__decorate([
    serializable({ label: 'Version', group: 'Metadata' }),
    __metadata("design:type", Number)
], Manifest.prototype, "version", void 0);
__decorate([
    serializable({ label: 'Last Scan Timestamp', group: 'Metadata' }),
    __metadata("design:type", Object)
], Manifest.prototype, "lastScanTimestamp", void 0);
__decorate([
    serializable({ label: 'Dirty Assets', group: 'Metadata' }),
    __metadata("design:type", Array)
], Manifest.prototype, "dirtyAssets", void 0);
__decorate([
    serializable({ label: 'Cloud Last Modified Cache', group: 'Metadata' }),
    __metadata("design:type", Object)
], Manifest.prototype, "cloudLastModifiedCacheData", void 0);
Manifest = Manifest_1 = __decorate([
    serializableClass({
        schemaVersion: 1,
        assetType: 'Manifest',
        displayName: 'Manifest',
        icon: '📋',
        category: AssetTypeCategory.Content,
    }),
    __metadata("design:paramtypes", [])
], Manifest);
export { Manifest };
