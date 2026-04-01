import pLimit from 'p-limit';
import { DesktopAssetCache } from '@/adapters/assets/DesktopAssetCache';
import { getEntryIndexAssetGuids } from '@/adapters/assets/EntryIndexService';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { MainAppAssetTarget } from '@/services/storage/assetTarget';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

export interface DesktopAssetWarmupState {
  status: 'idle' | 'running' | 'completed' | 'error';
  total: number;
  completed: number;
  failed: number;
  message: string;
}

type Listener = () => void;

const log = MainAppLogger.instance;
log.register(import.meta.url);

function getAssetUrlByGuid(guid: string): string | null {
  const base = getStorageConfig().assetsPublicUrl.replace(/\/$/, '');
  if (!base) {
    return null;
  }

  return `${base}/${encodeURIComponent(guid)}`;
}

class DesktopAssetWarmupService {
  private readonly cache = new DesktopAssetCache();
  private readonly listeners = new Set<Listener>();
  private state: DesktopAssetWarmupState = {
    status: 'idle',
    total: 0,
    completed: 0,
    failed: 0,
    message: '',
  };
  private started = false;

  getState(): DesktopAssetWarmupState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(): Promise<void> {
    if (this.started || !DesktopAssetCache.isAvailable()) {
      return;
    }

    const storageConfig = getStorageConfig();
    const isLocalDevAssets =
      import.meta.env.DEV || storageConfig.assetTarget?.key === MainAppAssetTarget.LocalDev;
    if (isLocalDevAssets) {
      return;
    }

    this.started = true;
    this.setState({
      status: 'running',
      total: 0,
      completed: 0,
      failed: 0,
      message: 'Checking desktop asset cache...',
    });

    try {
      await this.cache.initialize();
      const guids = await getEntryIndexAssetGuids();
      const missingGuids: string[] = [];
      for (const guid of guids) {
        if (!(await this.cache.isCached(guid))) {
          missingGuids.push(guid);
        }
      }

      if (missingGuids.length === 0) {
        this.setState({
          status: 'completed',
          total: 0,
          completed: 0,
          failed: 0,
          message: 'Desktop asset cache is already warm.',
        });
        return;
      }

      this.setState({
        status: 'running',
        total: missingGuids.length,
        completed: 0,
        failed: 0,
        message: `Caching ${missingGuids.length} desktop assets...`,
      });

      const limit = pLimit(4);
      let completed = 0;
      let failed = 0;

      await Promise.all(
        missingGuids.map((guid) =>
          limit(async () => {
            const url = getAssetUrlByGuid(guid);
            if (!url) {
              failed += 1;
              completed += 1;
              this.publishProgress(completed, missingGuids.length, failed);
              return;
            }

            try {
              const cached = await this.cache.downloadAndCacheAsset(guid, url);
              if (!cached) {
                failed += 1;
              }
            } catch (error) {
              failed += 1;
              log.logWarn('[DesktopAssetWarmup] Failed to cache asset', getStackTrace(), { guid, error });
            } finally {
              completed += 1;
              this.publishProgress(completed, missingGuids.length, failed);
            }
          })
        )
      );

      this.setState({
        status: failed > 0 ? 'error' : 'completed',
        total: missingGuids.length,
        completed,
        failed,
        message:
          failed > 0
            ? `Desktop cache completed with ${failed} failed asset downloads.`
            : `Desktop cache ready. Downloaded ${completed} assets.`,
      });
    } catch (error) {
      log.logError('[DesktopAssetWarmup] Failed to warm desktop cache', getStackTrace(), { error });
      this.setState({
        status: 'error',
        total: this.state.total,
        completed: this.state.completed,
        failed: this.state.failed + 1,
        message: 'Desktop asset cache warmup failed.',
      });
    }
  }

  resetForTests(): void {
    this.started = false;
    this.state = {
      status: 'idle',
      total: 0,
      completed: 0,
      failed: 0,
      message: '',
    };
    this.emit();
  }

  private publishProgress(completed: number, total: number, failed: number): void {
    this.setState({
      status: 'running',
      total,
      completed,
      failed,
      message: `Caching desktop assets ${completed}/${total}`,
    });
  }

  private setState(state: DesktopAssetWarmupState): void {
    this.state = state;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const desktopAssetWarmupService = new DesktopAssetWarmupService();
