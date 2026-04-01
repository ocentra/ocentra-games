import { avatarImageById } from '@ocentra/app-assets/avatars';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean, batchKey?: string) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled, batchKey);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled, batchKey);
  }
};
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean, batchKey?: string) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled, batchKey);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled, batchKey);
  }
};

log.register(import.meta.url);

const BATCH_KEY_AVATAR_MAPPING = 'AvatarAssetManager.avatarMapping';

log.registerBatchContext(BATCH_KEY_AVATAR_MAPPING, {
  enabled: true,
  batchSize: 20,
  flushInterval: 1000,
});

export interface AvatarInfo {
  id: string;
  name: string;
  url: string;
  resourcePath: string;
  rarity?: 'common' | 'rare' | 'legendary';
}

const DEFAULT_AVATARS: Omit<AvatarInfo, 'url'>[] = Array.from({ length: 18 }, (_, i) => ({
  id: `avatar-${i + 1}`,
  name: `Avatar ${i + 1}`,
  resourcePath: `/Resources/AppAssets/Avatars/${i + 1}.png`,
  rarity: 'common' as const,
}));

export class AvatarAssetManager {
  private static instance: AvatarAssetManager | null = null;
  private cache = new Map<string, AvatarInfo[]>();
  private loadingPromises = new Map<string, Promise<AvatarInfo[]>>();

  private constructor() {}

  static getInstance(): AvatarAssetManager {
    if (!AvatarAssetManager.instance) {
      AvatarAssetManager.instance = new AvatarAssetManager();
    }
    return AvatarAssetManager.instance;
  }

  async getAvatars(setPath?: string): Promise<AvatarInfo[]> {
    if (setPath) {
      logWarn('Custom avatar sets not yet supported, returning default avatars', undefined, false);
    }

    const cacheKey = setPath || 'default';
    if (this.cache.has(cacheKey)) {
      logInfo('Using cached avatars for:', cacheKey);
      return this.cache.get(cacheKey)!;
    }

    if (this.loadingPromises.has(cacheKey)) {
      logInfo('Avatar load already in progress, waiting for existing promise:', cacheKey);
      return this.loadingPromises.get(cacheKey)!;
    }

    const loadPromise = this._loadAvatars(cacheKey);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async _loadAvatars(cacheKey: string): Promise<AvatarInfo[]> {
    logInfo(`Loading ${DEFAULT_AVATARS.length} pre-defined avatars`);
    
    const avatars: AvatarInfo[] = DEFAULT_AVATARS.map((avatar, index) => {
      const avatarNumber = index + 1;
      const url = avatarImageById[avatarNumber as keyof typeof avatarImageById] as string;
      logInfo(`Mapped avatar: ${avatar.id} to URL: ${url}`, undefined, undefined, BATCH_KEY_AVATAR_MAPPING);
      return {
        ...avatar,
        url,
      };
    });

    this.cache.set(cacheKey, avatars);
    logInfo(`Cached ${avatars.length} avatars`);
    return avatars;
  }

  async getAvatarUrl(id: string, setPath?: string): Promise<string | null> {
    const avatars = await this.getAvatars(setPath);
    const avatar = avatars.find(a => a.id === id);
    return avatar?.url || null;
  }

  async getDefaultAvatarUrl(): Promise<string | null> {
    const avatars = await this.getAvatars();
    if (avatars.length === 0) {
      return null;
    }
    return avatars[0].url;
  }

  getRandomAvatar(avatars?: AvatarInfo[]): AvatarInfo | null {
    const list = avatars || this.cache.get('default') || [];
    if (list.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  }

  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}
