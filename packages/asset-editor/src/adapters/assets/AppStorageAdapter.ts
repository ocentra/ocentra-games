import type { IStorageAdapter } from '@ocentra/asset-domain/storage/IStorageAdapter';
import { NetworkRouter } from '@/adapters/network/NetworkRouter';

export class AppStorageAdapter implements IStorageAdapter {
  async getByGuid(guid: string): Promise<Response | null> {
    try {
      const router = NetworkRouter.getInstance();
      return await router.getResource({ guid });
    } catch {
      return null;
    }
  }
}
