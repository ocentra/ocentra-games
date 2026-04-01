import type { AssetClass } from '@ocentra/eventing-domain/events/assets/GetAssetConstructorEvent';
export interface TypeRegistryConfig {
    assetTypeMap: Record<string, {
        importPath: string;
        assetType: string;
        displayName?: string;
        icon?: string;
        category?: string;
        commonType?: string;
    }>;
    assetConstructorLoaders?: Record<string, () => Promise<unknown>>;
}
export type { AssetCategory } from '@ocentra/asset-domain/constants/assets';
export declare class TypeRegistry {
    static executionOrder: number;
    private static assetTypeMap;
    private static assetConstructorLoaders;
    static configure(config: TypeRegistryConfig): void;
    private static getAssetTypeMap;
    private static cachedInstance;
    private static initPromise;
    private static loadedConstructors;
    private static loadingPromises;
    private static eventRegistrar;
    private static typeCheckCache;
    private types;
    static clearCache(): void;
    private static setupEventSubscription;
    private static onIsTypeOfEvent;
    private static onGetAssetTypeInfoEvent;
    private static onGetAllAssetTypesEvent;
    private static onGetAssetTypesByCategoryEvent;
    private static onHasAssetTypeEvent;
    private static onGetAssetConstructorEvent;
    private static onCreateAssetTemplateEvent;
    static getRegisteredClasses(): ReadonlyMap<string, AssetClass>;
    constructor();
    private static registerService;
    static getOrCreateInstance(): Promise<TypeRegistry>;
    private getAssetConstructor;
    private getAssetTypeInfo;
    private getAllAssetTypes;
    private hasAssetType;
}
