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

