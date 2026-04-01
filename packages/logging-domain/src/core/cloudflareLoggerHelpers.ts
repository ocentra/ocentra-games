import type { InternalLogEntry } from '@/types/internalLogEntry';
import type { CloudflareStorageProvider } from '@/storage/cloudflareStorageProvider';

let storedCloudflareStorage: CloudflareStorageProvider | null = null;

export function setStoredCloudflareStorage(storage: CloudflareStorageProvider | null): void {
  storedCloudflareStorage = storage;
}

export function getStoredCloudflareStorage(): CloudflareStorageProvider | null {
  return storedCloudflareStorage;
}

export function getLogs(): InternalLogEntry[] {
  if (!storedCloudflareStorage) {
    return [];
  }
  return storedCloudflareStorage.getLogs();
}

export function getDebugLogBuffer(): InternalLogEntry[] {
  if (!storedCloudflareStorage) {
    return [];
  }
  return storedCloudflareStorage.getDebugLogBuffer();
}

export async function flushDebugLogs(): Promise<void> {
  if (!storedCloudflareStorage) {
    return;
  }
  await storedCloudflareStorage.flushR2DebugLogs(true);
}

export async function clearDebugLogs(): Promise<void> {
  if (!storedCloudflareStorage) {
    return;
  }
  if (storedCloudflareStorage.clearDebugLogs) {
    await storedCloudflareStorage.clearDebugLogs();
  }
}
