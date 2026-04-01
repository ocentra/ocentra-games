import type { PlatformUrlAdapter } from '@/types/platform-url-adapter';

let platformUrlAdapter: PlatformUrlAdapter | null = null;

export function setPlatformUrlAdapter(adapter: PlatformUrlAdapter): void {
  platformUrlAdapter = adapter;
}

export function clearPlatformUrlAdapter(): void {
  platformUrlAdapter = null;
}

export function getPlatformUrlAdapter(): PlatformUrlAdapter {
  if (platformUrlAdapter) return platformUrlAdapter;
  return {
    isLocalResource(url: string): boolean {
      return (
        url.startsWith('chrome-extension://') ||
        url.startsWith('file://') ||
        url.startsWith('blob:') ||
        url.startsWith('app:') ||
        url.startsWith('capacitor://')
      );
    },
  };
}
