import { deserializeAsset } from '../serialization/AssetSerializer.js';
export class AssetLoader {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async loadByGuid(constructor, guid) {
        const response = await this.storage.getByGuid(guid);
        if (!response || !response.ok) {
            return null;
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            return null;
        }
        const text = await response.text();
        try {
            return deserializeAsset(constructor, text);
        }
        catch {
            return null;
        }
    }
}
