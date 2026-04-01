import type { AssetLoader } from '@/loader/AssetLoader';

let loaderInstance: AssetLoader | null = null;

export function setAssetLoader(loader: AssetLoader | null): void {
  loaderInstance = loader;
}

export function getAssetLoader(): AssetLoader | null {
  return loaderInstance;
}
