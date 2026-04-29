import {
  createCardGameEditorIsolationVisibility,
  createCardGameEditorOverlayVisibility,
  type CardGameEditorOverlayVisibility,
  type CardGameLayerVisibility,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';

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
const LAYOUT_EDITOR_OVERLAY_PREFS_PREFIX = 'ocentra-layout-editor-overlay-prefs';
const LAYOUT_EDITOR_CAMERA_PREFIX = 'ocentra-layout-editor-camera';

export interface LayoutEditorOverlayPreferences {
  showHandles: boolean;
  showArenaGuide: boolean;
  isolationVisibility: CardGameLayerVisibility;
  boundsVisibility: CardGameEditorOverlayVisibility;
}

export interface LayoutEditorCanvasCameraState {
  zoom: number;
  panX: number;
  panY: number;
}

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

export function getLayoutEditorOverlayPreferencesKey(assetPath: string): string {
  return `${LAYOUT_EDITOR_OVERLAY_PREFS_PREFIX}:${assetPath}`;
}

export function readStoredLayoutEditorOverlayPreferences(
  assetPath: string,
  fallback?: Partial<LayoutEditorOverlayPreferences>,
): LayoutEditorOverlayPreferences {
  const overlayFallback = {
    ...createCardGameEditorOverlayVisibility(),
    ...(fallback?.boundsVisibility ?? {}),
  };
  const isolationFallback = {
    ...createCardGameEditorIsolationVisibility(),
    ...(fallback?.isolationVisibility ?? {}),
  };
  const resolvedFallback: LayoutEditorOverlayPreferences = {
    showHandles: fallback?.showHandles ?? false,
    showArenaGuide: fallback?.showArenaGuide ?? false,
    isolationVisibility: isolationFallback,
    boundsVisibility: overlayFallback,
  };
  if (!assetPath || !canUseStorage()) {
    return resolvedFallback;
  }

  const stored = window.localStorage.getItem(getLayoutEditorOverlayPreferencesKey(assetPath));
  if (!stored) {
    return resolvedFallback;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<LayoutEditorOverlayPreferences>;
    const parsedBounds = parsed.boundsVisibility ?? {};
    const parsedIsolation = parsed.isolationVisibility ?? {};
    return {
      showHandles: typeof parsed.showHandles === 'boolean' ? parsed.showHandles : resolvedFallback.showHandles,
      showArenaGuide: typeof parsed.showArenaGuide === 'boolean' ? parsed.showArenaGuide : resolvedFallback.showArenaGuide,
      isolationVisibility: {
        ...isolationFallback,
        ...Object.fromEntries(
          Object.entries(parsedIsolation).filter(([, value]) => typeof value === 'boolean'),
        ) as Partial<CardGameLayerVisibility>,
      },
      boundsVisibility: {
        ...overlayFallback,
        ...Object.fromEntries(
          Object.entries(parsedBounds).filter(([, value]) => typeof value === 'boolean'),
        ) as Partial<CardGameEditorOverlayVisibility>,
      },
    };
  } catch {
    return resolvedFallback;
  }
}

export function writeStoredLayoutEditorOverlayPreferences(
  assetPath: string,
  preferences: LayoutEditorOverlayPreferences,
): void {
  if (!assetPath || !canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    getLayoutEditorOverlayPreferencesKey(assetPath),
    JSON.stringify(preferences),
  );
}

export function getLayoutEditorCameraKey(
  assetPath: string,
  viewportSignature: string,
  orientation: 'portrait' | 'landscape',
): string {
  return `${LAYOUT_EDITOR_CAMERA_PREFIX}:${assetPath}:${viewportSignature}:${orientation}`;
}

export function readStoredLayoutEditorCameraState(
  assetPath: string,
  viewportSignature: string,
  orientation: 'portrait' | 'landscape',
): LayoutEditorCanvasCameraState | null {
  if (!assetPath || !viewportSignature || !canUseStorage()) {
    return null;
  }

  const stored = window.localStorage.getItem(
    getLayoutEditorCameraKey(assetPath, viewportSignature, orientation),
  );
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<LayoutEditorCanvasCameraState>;
    if (
      !Number.isFinite(parsed.zoom) ||
      !Number.isFinite(parsed.panX) ||
      !Number.isFinite(parsed.panY)
    ) {
      return null;
    }

    return {
      zoom: Number(parsed.zoom),
      panX: Number(parsed.panX),
      panY: Number(parsed.panY),
    };
  } catch {
    return null;
  }
}

export function writeStoredLayoutEditorCameraState(
  assetPath: string,
  viewportSignature: string,
  orientation: 'portrait' | 'landscape',
  state: LayoutEditorCanvasCameraState,
): void {
  if (!assetPath || !viewportSignature || !canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    getLayoutEditorCameraKey(assetPath, viewportSignature, orientation),
    JSON.stringify(state),
  );
}
