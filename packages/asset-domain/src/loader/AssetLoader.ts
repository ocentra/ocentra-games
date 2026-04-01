import type { IStorageAdapter } from '@/storage/IStorageAdapter';
import { deserializeAsset } from '@/serialization/AssetSerializer';

export class AssetLoader {
  constructor(private readonly storage: IStorageAdapter) {}

  async loadByGuid<T>(
    constructor: new () => T,
    guid: string
  ): Promise<T | null> {
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
    } catch {
      return null;
    }
  }
}
