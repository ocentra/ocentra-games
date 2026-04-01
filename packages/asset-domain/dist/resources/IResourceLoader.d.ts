export interface IResourceLoader {
    resolveAssetUrlByGuid(identifier: string): Promise<string>;
    resolveImageUrlByHash(identifier: string): Promise<string>;
    loadAssetByGuid(guid: string): Promise<Response>;
    assetExists(guid: string): Promise<boolean>;
}
