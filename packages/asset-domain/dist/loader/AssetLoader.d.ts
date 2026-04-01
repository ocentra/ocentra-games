import type { IStorageAdapter } from '../storage/IStorageAdapter';
export declare class AssetLoader {
    private readonly storage;
    constructor(storage: IStorageAdapter);
    loadByGuid<T>(constructor: new () => T, guid: string): Promise<T | null>;
}
