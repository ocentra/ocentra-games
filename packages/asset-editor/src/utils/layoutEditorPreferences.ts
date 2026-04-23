const LAYOUT_EDITOR_PLAYER_COUNT_PREFIX = 'ocentra-layout-editor-player-count';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clampPlayerCount(value: number, fallback: number, minPlayerCount?: number, maxPlayerCount?: number): number {
  const resolvedMin = minPlayerCount ?? 2;
  const resolvedMax = maxPlayerCount ?? 10;
  const normalized = Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(resolvedMin, Math.min(resolvedMax, normalized));
}

export function getLayoutEditorPlayerCountStorageKey(assetPath: string): string {
  return `${LAYOUT_EDITOR_PLAYER_COUNT_PREFIX}:${assetPath}`;
}

export function readStoredLayoutEditorPlayerCount(
  assetPath: string,
  fallback: number,
  minPlayerCount?: number,
  maxPlayerCount?: number,
): number {
  if (!assetPath || !canUseStorage()) {
    return clampPlayerCount(fallback, fallback, minPlayerCount, maxPlayerCount);
  }

  const stored = window.localStorage.getItem(getLayoutEditorPlayerCountStorageKey(assetPath));
  if (!stored) {
    return clampPlayerCount(fallback, fallback, minPlayerCount, maxPlayerCount);
  }

  return clampPlayerCount(Number(stored), fallback, minPlayerCount, maxPlayerCount);
}

export function writeStoredLayoutEditorPlayerCount(assetPath: string, playerCount: number): void {
  if (!assetPath || !canUseStorage()) {
    return;
  }

  window.localStorage.setItem(getLayoutEditorPlayerCountStorageKey(assetPath), String(playerCount));
}


export interface CustomDevice {
  label: string;
  value: string; // "WxH"
}

const CUSTOM_DEVICES_KEY = 'ocentra-layout-editor-custom-devices';

export function readStoredCustomDevices(): CustomDevice[] {
  if (!canUseStorage()) return [];
  const stored = window.localStorage.getItem(CUSTOM_DEVICES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as CustomDevice[];
  } catch {
    return [];
  }
}

export function writeStoredCustomDevices(devices: CustomDevice[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CUSTOM_DEVICES_KEY, JSON.stringify(devices));
}
