import type { IStorageAdapter } from '@ocentra/asset-domain/storage/IStorageAdapter';
import { getRuntimeAssetCache } from '@/adapters/assets/assetCacheRuntime';
import { NetworkRouter } from '@/adapters/network/NetworkRouter';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';

export class AppStorageAdapter implements IStorageAdapter {
  private cacheInitialized = false;

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }

  private async ensureCache(): Promise<void> {
    if (this.cacheInitialized) return;
    await getRuntimeAssetCache().initialize();
    this.cacheInitialized = true;
  }

  async getByGuid(guid: string): Promise<Response | null> {
    try {
      await this.ensureCache();
      const cache = getRuntimeAssetCache();
      const cached = await cache.getCachedAssetByGuid(guid);
      if (cached) {
        return new Response(this.toArrayBuffer(cached.content), {
          headers: {
            [HttpHeader.ContentType]: cached.contentType || HttpContentType.ApplicationJson,
          },
        });
      }
      const config = getStorageConfig();
      const base = config.assetsPublicUrl?.replace(/\/$/, '');
      if (base) {
        const res = await fetch(`${base}/${encodeURIComponent(guid)}`);
        if (!res.ok) return null;
        const content = new Uint8Array(await res.arrayBuffer());
        const contentType = res.headers.get(HttpHeader.ContentType) || HttpContentType.ApplicationJson;
        await cache.cacheAsset(guid, `${guid}.asset`, content, contentType);
        return new Response(this.toArrayBuffer(content), {
          headers: { [HttpHeader.ContentType]: contentType },
        });
      }
      const router = NetworkRouter.getInstance();
      return await router.getResource({ guid });
    } catch {
      return null;
    }
  }
}
