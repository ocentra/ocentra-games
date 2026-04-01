import type { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getFilePathFromUrl } from '@ocentra/app-core/path';
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { GetAllAssetTypesEvent } from '@ocentra/eventing-domain/events/assets/GetAllAssetTypesEvent';
import { GetAssetTypesByCategoryEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypesByCategoryEvent';
import { HasAssetTypeEvent } from '@ocentra/eventing-domain/events/assets/HasAssetTypeEvent';
import { CreateAssetTemplateEvent } from '@ocentra/eventing-domain/events/assets/CreateAssetTemplateEvent';
import { GetAssetConstructorEvent } from '@ocentra/eventing-domain/events/assets/GetAssetConstructorEvent';
import { IsTypeOfEvent } from '@ocentra/eventing-domain/events/assets/IsTypeOfEvent';
import type { AssetClass } from '@ocentra/eventing-domain/events/assets/GetAssetConstructorEvent';
import { get as getAssetTypeConstructor, has as hasAssetType, register as registerAssetType } from '@ocentra/asset-domain/registry/AssetTypeRegistry';
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';
import type { AssetTypeInfo } from '@/constants/asset-type-info';
import type { AssetCategory } from '@ocentra/asset-domain/constants/assets';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { registerGameAssetRuntimeValidation } from '@/schemas/registerRuntimeAssetValidation';

export interface TypeRegistryConfig {
    assetTypeMap: Record<string, { importPath: string; assetType: string; displayName?: string; icon?: string; category?: string; commonType?: string }>;
    assetConstructorLoaders?: Record<string, () => Promise<unknown>>;
}

export type { AssetCategory } from '@ocentra/asset-domain/constants/assets';

const log = MainAppLogger.instance;
const LOG_ASSETS = false;
const LOG_INSPECTOR_CONSTRUCTOR = false;

const PREFIX = 'TypeRegistry';

const shouldLog = (enabled: boolean = false) => LOG_ASSETS || LOG_INSPECTOR_CONSTRUCTOR || enabled;

const logInfo = (message: string, data?: unknown, enabled: boolean = false, batchKey?: string) => {
    if (shouldLog(enabled)) {
        log.logInfo(message, getStackTrace(), data, enabled, batchKey);
    }
};

const logDebug = (message: string, data?: unknown, enabled: boolean = false, batchKey?: string) => {
    if (shouldLog(enabled)) {
        log.logDebug(message, getStackTrace(), data, enabled, batchKey);
    }
};

const logWarn = (message: string, data?: unknown, enabled: boolean = false) => {
    if (shouldLog(enabled)) {
        log.logWarn(message, getStackTrace(), data);
    }
};

const logError = (message: string, data?: unknown, enabled: boolean = false) => {
    if (shouldLog(enabled)) {
        log.logError(message, getStackTrace(), data);
    }
};

log.register(import.meta.url);

const BATCH_KEY_CONSTRUCTOR_LOADED = 'constructorLoaded';
const BATCH_KEY_CACHED_TYPE_INFO = 'cachedTypeInfo';
const BATCH_KEY_GET_TYPE_INFO = 'getTypeInfo';
const BATCH_KEY_GET_CONSTRUCTOR = 'getConstructor';
const BATCH_KEY_CACHED_CONSTRUCTOR = 'cachedConstructor';
const BATCH_KEY_FOUND_METADATA = 'foundMetadata';
const BATCH_KEY_CONVERTING_PATH = 'convertingPath';
const BATCH_KEY_STARTING_IMPORT = 'startingImport';
const BATCH_KEY_MODULE_LOADED = 'moduleLoaded';
const BATCH_KEY_FOUND_CONSTRUCTOR = 'foundConstructor';
const BATCH_KEY_CONSTRUCTOR_FOUND = 'constructorFound';
const BATCH_KEY_CONSTRUCTOR_ALREADY_LOADING = 'constructorAlreadyLoading';
const BATCH_KEY_CREATING_TYPE_INFO = 'creatingTypeInfo';
const BATCH_KEY_TYPE_INFO_CREATED = 'typeInfoCreated';

log.registerBatchContext(BATCH_KEY_CONSTRUCTOR_LOADED, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_CACHED_TYPE_INFO, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_GET_TYPE_INFO, {
    enabled: true,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_GET_CONSTRUCTOR, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_CACHED_CONSTRUCTOR, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_FOUND_METADATA, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_CONVERTING_PATH, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_STARTING_IMPORT, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_MODULE_LOADED, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_FOUND_CONSTRUCTOR, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_CONSTRUCTOR_FOUND, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_CONSTRUCTOR_ALREADY_LOADING, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_CREATING_TYPE_INFO, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_TYPE_INFO_CREATED, {
    enabled: false,
    batchSize: 20,
    flushInterval: 1000,
});

import { normalizeAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';

export class TypeRegistry {
    static executionOrder = -75;

    private static assetTypeMap: TypeRegistryConfig['assetTypeMap'] | null = null;
    private static assetConstructorLoaders: Record<string, () => Promise<unknown>> | null = null;

    static configure(config: TypeRegistryConfig): void {
        this.assetTypeMap = config.assetTypeMap;
        this.assetConstructorLoaders = config.assetConstructorLoaders ?? null;
    }

    private static getAssetTypeMap(): TypeRegistryConfig['assetTypeMap'] {
        const map = this.assetTypeMap;
        if (!map) {
            throw new Error('TypeRegistry.configure({ assetTypeMap }) must be called before using TypeRegistry');
        }
        return map;
    }

    private static cachedInstance: TypeRegistry | null = null;
    private static initPromise: Promise<TypeRegistry> | null = null;

    private static loadedConstructors = new Map<string, AssetClass>();
    private static loadingPromises = new Map<string, Promise<AssetClass | null>>();
    private static eventRegistrar: EventRegistrar | null = null;
    private static typeCheckCache: Map<string, Map<string, boolean>> = new Map();

    private types = new Map<string, AssetTypeInfo>();

    static clearCache(): void {
        this.loadedConstructors.clear();
        this.loadingPromises.clear();
        this.typeCheckCache.clear();
    }

    static {
        log.register(import.meta.url);
        registerGameAssetRuntimeValidation();
        this.registerService();
        this.setupEventSubscription();
    }

    private static setupEventSubscription(): void {
        if (this.eventRegistrar) return;

        if (shouldLog()) {
            logInfo(` EVENT STEP 1: Setting up event subscriptions`);
        }

        this.eventRegistrar = new EventRegistrar();

        this.eventRegistrar.subscribeAsync(GetAssetTypeInfoEvent, this.onGetAssetTypeInfoEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetAllAssetTypesEvent, this.onGetAllAssetTypesEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetAssetTypesByCategoryEvent, this.onGetAssetTypesByCategoryEvent.bind(this));
        this.eventRegistrar.subscribeAsync(HasAssetTypeEvent, this.onHasAssetTypeEvent.bind(this));
        this.eventRegistrar.subscribeAsync(CreateAssetTemplateEvent, this.onCreateAssetTemplateEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetAssetConstructorEvent, this.onGetAssetConstructorEvent.bind(this));
        this.eventRegistrar.subscribeAsync(IsTypeOfEvent, this.onIsTypeOfEvent.bind(this));

        if (shouldLog()) {
            logInfo(` EVENT STEP 2: Event subscriptions set up successfully`);
        }
    }

    private static async onIsTypeOfEvent(event: IsTypeOfEvent): Promise<void> {
        try {
            const normalizedType = normalizeAssetType(event.assetType);
            let typeToCheckKey: string;

            if (typeof event.typeToCheck === 'string') {
                typeToCheckKey = normalizeAssetType(event.typeToCheck);
            } else {
                typeToCheckKey = event.typeToCheck.name;
            }

            if (!TypeRegistry.typeCheckCache.has(normalizedType)) {
                TypeRegistry.typeCheckCache.set(normalizedType, new Map());
            }

            const typeCache = TypeRegistry.typeCheckCache.get(normalizedType)!;

            if (typeCache.has(typeToCheckKey)) {
                if (!event.deferred.isSettled()) {
                    event.deferred.resolve(OperationResult.success(typeCache.get(typeToCheckKey)!));
                }
                return;
            }

            let result = false;

            if (typeof event.typeToCheck === 'string') {
                const normalizedCheckType = normalizeAssetType(event.typeToCheck);
                result = normalizedType === normalizedCheckType;
            } else {
                const deferred = new OperationDeferred<AssetClass | null>();
                await EventBus.instance.publishAsync(new GetAssetConstructorEvent(event.assetType, deferred));
                const constructorResult = await deferred.promise;

                if (constructorResult.isSuccess && constructorResult.value) {
                    const constructor = constructorResult.value;
                    let currentConstructor: unknown = constructor;

                    while (currentConstructor) {
                        if (currentConstructor === event.typeToCheck) {
                            result = true;
                            break;
                        }

                        if (typeof currentConstructor !== 'function' || !currentConstructor.prototype) {
                            break;
                        }

                        const prototype = Object.getPrototypeOf(currentConstructor.prototype);
                        if (!prototype || !prototype.constructor) {
                            break;
                        }

                        const nextConstructor = prototype.constructor;
                        if (!nextConstructor || nextConstructor === currentConstructor || nextConstructor === Object || nextConstructor === Function) {
                            break;
                        }

                        currentConstructor = nextConstructor;
                    }
                }
            }

            typeCache.set(typeToCheckKey, result);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(result));
            }
        } catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to check if asset type matches type';
            if (shouldLog()) {
                logError(' Failed to check if asset type matches type', {
                    assetType: event.assetType,
                    typeToCheck: typeof event.typeToCheck === 'string' ? event.typeToCheck : event.typeToCheck.name,
                    error: failureMessage,
                    fullError: error,
                });
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }

    private static async onGetAssetTypeInfoEvent(event: GetAssetTypeInfoEvent): Promise<void> {
        try {
            if (shouldLog()) {
                log.logInfo(' GetAssetTypeInfoEvent received', getStackTrace(), { assetType: event.assetType });
            }
            const registry = await this.getOrCreateInstance();
            const info = await registry.getAssetTypeInfo(event.assetType);
            if (shouldLog()) {
                log.logInfo(' getAssetTypeInfo returned', getStackTrace(), {
                    assetType: event.assetType,
                    found: !!info,
                    constructorName: info?.constructor?.name,
                    constructorType: typeof info?.constructor,
                    isFunction: typeof info?.constructor === 'function',
                    hasPrototype: info?.constructor ? 'prototype' in info.constructor : false,
                    prototypeConstructor: info?.constructor?.prototype?.constructor?.name,
                    fullInfo: info ? {
                        assetType: info.assetType,
                        displayName: info.displayName,
                        hasConstructor: !!info.constructor
                    } : null
                });
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(info ?? null));
            }
        } catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get asset type info';
            if (shouldLog()) {
                logError(' Failed to get asset type info', { assetType: event.assetType, error: failureMessage, fullError: error });
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }

    private static async onGetAllAssetTypesEvent(event: GetAllAssetTypesEvent): Promise<void> {
        try {
            const registry = await this.getOrCreateInstance();
            const result = await registry.getAllAssetTypes();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(result));
            }
        } catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get all asset types';
            if (shouldLog()) {
                logError(' Failed to get all asset types', { error: failureMessage, fullError: error });
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }

    private static async onGetAssetTypesByCategoryEvent(event: GetAssetTypesByCategoryEvent): Promise<void> {
        try {
            const registry = await this.getOrCreateInstance();
            const allTypes = await registry.getAllAssetTypes();
            const result = allTypes.filter(info => info.category === event.category);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(result));
            }
        } catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get asset types by category';
            if (shouldLog()) {
                logError(' Failed to get asset types by category', { error: failureMessage, fullError: error });
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }

    private static async onHasAssetTypeEvent(event: HasAssetTypeEvent): Promise<void> {
        try {
            const registry = await this.getOrCreateInstance();
            const result = await registry.hasAssetType(event.assetType);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(result));
            }
        } catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to check asset type';
            if (shouldLog()) {
                logError(' Failed to check asset type', { error: failureMessage, fullError: error });
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }

    private static async onGetAssetConstructorEvent(event: GetAssetConstructorEvent): Promise<void> {
        try {
            const registry = await this.getOrCreateInstance();
            const constructor = await registry.getAssetConstructor(event.assetType);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(constructor));
            }
        } catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get asset constructor';
            if (shouldLog()) {
                logError(' Failed to get asset constructor', { assetType: event.assetType, error: failureMessage, fullError: error });
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }

    private static async onCreateAssetTemplateEvent(event: CreateAssetTemplateEvent): Promise<void> {
        try {
            const registry = await this.getOrCreateInstance();
            const info = await registry.getAssetTypeInfo(event.assetType);
            if (!info) {
                if (shouldLog()) {
                    logError(' Unknown asset type', { assetType: event.assetType });
                }
                if (!event.deferred.isSettled()) {
                    event.deferred.resolve(OperationResult.success(null));
                }
                return;
            }
            const result = info.createTemplate();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(result));
            }
        } catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to create asset template';
            if (shouldLog()) {
                logError(' Failed to create asset template', { error: failureMessage, fullError: error });
            }
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }

    static getRegisteredClasses(): ReadonlyMap<string, AssetClass> {
        return this.loadedConstructors;
    }

    constructor() {
    }

    private static registerService(): void {
        ServiceRegistry.register(
            this as { executionOrder?: number },
            PREFIX,
            () => this.getOrCreateInstance()
        );
    }

    static async getOrCreateInstance(): Promise<TypeRegistry> {
        if (this.cachedInstance) {
            return this.cachedInstance;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            const instance = new TypeRegistry();
            this.cachedInstance = instance;

            if (shouldLog()) {
                const map = TypeRegistry.getAssetTypeMap();
                logInfo(' Initialized with pre-generated assetTypeMap', {
                    totalTypes: Object.keys(map).length
                });
            }

            return instance;
        })();

        const instance = await this.initPromise;
        this.initPromise = null;
        return instance;
    }

    private async getAssetConstructor(assetType: string): Promise<AssetClass | null> {
        const normalizedType = normalizeAssetType(assetType);

        if (shouldLog()) {
            logInfo(' getAssetConstructor called', { assetType, normalizedType }, false, BATCH_KEY_GET_CONSTRUCTOR);
        }

        if (hasAssetType(normalizedType)) {
            const fromRegistry = getAssetTypeConstructor(normalizedType) as AssetClass | null;
            if (fromRegistry) {
                if (shouldLog()) {
                    logInfo(' Using AssetTypeRegistry constructor', { assetType, constructorName: fromRegistry.name }, false, BATCH_KEY_CACHED_CONSTRUCTOR);
                }
                return fromRegistry;
            }
        }

        if (TypeRegistry.loadedConstructors.has(normalizedType)) {
            const cached = TypeRegistry.loadedConstructors.get(normalizedType)!;
            if (shouldLog()) {
                logInfo(' Using cached constructor', { assetType, constructorName: cached.name }, false, BATCH_KEY_CACHED_CONSTRUCTOR);
            }
            return cached;
        }

        if (TypeRegistry.loadingPromises.has(normalizedType)) {
            if (shouldLog()) {
                logInfo(' Constructor already loading, waiting...', { assetType }, false, BATCH_KEY_CONSTRUCTOR_ALREADY_LOADING);
            }
            return await TypeRegistry.loadingPromises.get(normalizedType)!;
        }

        const map = TypeRegistry.getAssetTypeMap();
        const metadata = map[normalizedType];
        if (!metadata) {
            if (shouldLog()) {
                logWarn(' No asset type found in map', { assetType, normalizedType, availableTypes: Object.keys(map) });
            }
            return null;
        }

        if (shouldLog()) {
            logInfo(' Found metadata in map', { assetType, metadata }, false, BATCH_KEY_FOUND_METADATA);
        }

        const loadPromise = (async () => {
            try {
                const loaders = TypeRegistry.assetConstructorLoaders;
                const useLoader = loaders?.[normalizedType] && metadata.importPath.startsWith('@ocentra/');
                let module: Record<string, unknown>;
                if (useLoader) {
                    if (shouldLog()) {
                        logInfo(' Using assetConstructorLoader', { assetType, importPath: metadata.importPath }, false, BATCH_KEY_STARTING_IMPORT);
                    }
                    module = (await loaders[normalizedType]()) as Record<string, unknown>;
                } else {
                    let importPath: string = metadata.importPath;
                    if (importPath.startsWith('@/')) {
                        const relativePath = importPath.replace('@/', '');
                        const currentFile = getFilePathFromUrl(import.meta.url);
                        const currentDepth = currentFile.split('/').length - 1;
                        const relativeImport = '../'.repeat(currentDepth) + relativePath;
                        importPath = relativeImport;
                        if (shouldLog()) {
                            logInfo(' Converting @/ path', { original: metadata.importPath, converted: importPath }, false, BATCH_KEY_CONVERTING_PATH);
                        }
                    }
                    if (shouldLog()) {
                        logInfo(' Starting dynamic import', { assetType, importPath }, false, BATCH_KEY_STARTING_IMPORT);
                    }
                    module = await import(/* @vite-ignore */ importPath);
                }

                if (shouldLog()) {
                    logDebug(' Module loaded', { assetType, importPath: metadata.importPath, moduleKeys: Object.keys(module) }, false, BATCH_KEY_MODULE_LOADED);
                }

                let constructor: unknown = null;

                const findConstructorByAssetType = (): unknown => {
                    for (const key of Object.keys(module)) {
                        const exportValue = module[key];
                        if (typeof exportValue === 'function') {
                            const staticAssetType = (exportValue as { assetType?: string }).assetType;
                            if (staticAssetType === normalizedType) {
                                if (shouldLog()) {
                                    logInfo(' Found constructor by assetType', { assetType: normalizedType, exportKey: key, constructorName: exportValue.name }, false, BATCH_KEY_FOUND_CONSTRUCTOR);
                                }
                                return exportValue;
                            }
                        }
                    }
                    return null;
                };

                constructor = findConstructorByAssetType();

                if (!constructor && module.default) {
                    const defaultExport = module.default;
                    if (typeof defaultExport === 'function') {
                        const staticAssetType = (defaultExport as { assetType?: string }).assetType;
                        if (staticAssetType === normalizedType) {
                            if (shouldLog()) {
                                logInfo(' Found constructor in default export by assetType', { assetType: normalizedType, constructorName: defaultExport.name }, false, BATCH_KEY_FOUND_CONSTRUCTOR);
                            }
                            constructor = defaultExport;
                        }
                    }
                }

                if (!constructor) {
                    if (shouldLog()) {
                        logError(' Constructor not found in module by assetType', { assetType, normalizedType, availableExports: Object.keys(module) });
                    }
                    return null;
                }

                if (typeof constructor !== 'function') {
                    if (shouldLog()) {
                        logError(' Exported value is not a function', { assetType, constructorType: typeof constructor });
                    }
                    return null;
                }

                if (shouldLog()) {
                    const constructorFunc = constructor as { name?: string; prototype?: { constructor?: { name?: string } } };
                    logInfo(' Constructor found', {
                        assetType,
                        constructorName: constructorFunc.name,
                        constructorType: typeof constructor,
                        isFunction: typeof constructor === 'function',
                        hasPrototype: 'prototype' in constructor,
                        prototypeConstructor: constructorFunc.prototype?.constructor?.name
                    }, false, BATCH_KEY_CONSTRUCTOR_FOUND);
                }

                TypeRegistry.loadedConstructors.set(normalizedType, constructor as AssetClass);
                registerAssetType(normalizedType, constructor as new () => unknown);
                if (shouldLog()) {
                    logInfo(' Constructor loaded and cached', { assetType, constructorName: constructor.name }, false, BATCH_KEY_CONSTRUCTOR_LOADED);
                }
                return constructor as AssetClass;
            } catch (error) {
                if (shouldLog()) {
                    logError(' Failed to load constructor', { assetType, importPath: metadata.importPath, error });
                }
                return null;
            }
        })();

        TypeRegistry.loadingPromises.set(normalizedType, loadPromise);
        const result = await loadPromise;
        TypeRegistry.loadingPromises.delete(normalizedType);

        return result;
    }

    private async getAssetTypeInfo(assetType: string): Promise<AssetTypeInfo | null> {
        const normalizedType = normalizeAssetType(assetType);
        if (shouldLog()) {
            logInfo(' getAssetTypeInfo called', { assetType, normalizedType }, false, BATCH_KEY_GET_TYPE_INFO);
        }
        if (this.types.has(normalizedType)) {
            const cached = this.types.get(normalizedType)!;
            if (shouldLog()) {
                logInfo(' Using cached type info', { assetType, cachedConstructorName: cached.constructor?.name }, false, BATCH_KEY_CACHED_TYPE_INFO);
            }
            return cached;
        }

        const map = TypeRegistry.getAssetTypeMap();
        const metadata = map[normalizedType];
        if (!metadata) {
            if (shouldLog()) {
                logWarn(' No metadata found in assetTypeMap', { assetType, normalizedType, availableTypes: Object.keys(map) });
            }
            return null;
        }

        if (shouldLog()) {
            logInfo(' Metadata found, loading constructor', { assetType, metadata }, false, BATCH_KEY_FOUND_METADATA);
        }

        const constructor = await this.getAssetConstructor(assetType);
        if (!constructor) {
            if (shouldLog()) {
                logError(' Constructor is null, cannot create type info', { assetType });
            }
            return null;
        }

        if (shouldLog()) {
            logInfo(' Constructor loaded, creating type info', {
                assetType,
                constructorName: constructor.name,
                constructorType: typeof constructor,
                isFunction: typeof constructor === 'function'
            }, false, BATCH_KEY_CREATING_TYPE_INFO);
        }

        const Constructor = constructor as unknown as typeof ScriptableObject & {
            assetType?: string;
            displayName?: string;
            icon?: string;
            category?: AssetCategory;
            createTemplate?: () => Record<string, unknown>;
        };

        const info: AssetTypeInfo = {
            assetType: normalizedType,
            displayName: metadata.displayName || Constructor.displayName || constructor.name,
            icon: metadata.icon || Constructor.icon || '📄',
            constructor: constructor as new () => ScriptableObject,
            createTemplate: Constructor.createTemplate || (() => ({})),
            category: (metadata.category as AssetCategory) || Constructor.category || AssetTypeCategory.Content,
        };

        if (shouldLog()) {
            logInfo(' Type info created', {
                assetType,
                info: {
                    assetType: info.assetType,
                    displayName: info.displayName,
                    hasConstructor: !!info.constructor,
                    constructorName: info.constructor?.name,
                    constructorType: typeof info.constructor
                }
            }, false, BATCH_KEY_TYPE_INFO_CREATED);
        }

        this.types.set(normalizedType, info);
        return info;
    }


    private async getAllAssetTypes(): Promise<AssetTypeInfo[]> {
        const map = TypeRegistry.getAssetTypeMap();
        const assetTypes = Object.keys(map);
        const loadPromises = assetTypes.map(assetType => {
            return this.getAssetTypeInfo(assetType);
        });
        const results = await Promise.all(loadPromises);
        return results.filter((info): info is AssetTypeInfo => info !== null);
    }

    private async hasAssetType(assetType: string): Promise<boolean> {
        const normalizedType = normalizeAssetType(assetType);
        return normalizedType in TypeRegistry.getAssetTypeMap();
    }
}

