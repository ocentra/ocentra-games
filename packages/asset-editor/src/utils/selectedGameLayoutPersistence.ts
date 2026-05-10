import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import {
  DEFAULT_SELECTED_GAME_CONTENT_PLAN,
  type SelectedGameContentPlan,
  type SelectedGameLayoutControls,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const SELECTED_GAME_LAYOUT_ASSET_PATH =
  'Resources/Pages/SelectedGameLayout.asset';

export interface SelectedGameLayoutAssetDocument extends PageLayoutDocument {
  layoutControls?: SelectedGameLayoutControls;
  contentPlan?: SelectedGameContentPlan;
}

interface AssetEnvelope {
  system: Record<string, unknown>;
  data: SelectedGameLayoutAssetDocument;
}

export interface SelectedGameLayoutConfig {
  layoutControls: SelectedGameLayoutControls;
  contentPlan: SelectedGameContentPlan;
  previewSampleGameId: string;
  debugBounds: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeEnvelope(value: unknown): AssetEnvelope {
  const record = asRecord(value);
  return {
    system: asRecord(record.system),
    data: asRecord(record.data) as unknown as SelectedGameLayoutAssetDocument,
  };
}

export function normalizeSelectedGameLayoutConfig(
  document: Partial<SelectedGameLayoutAssetDocument> | null | undefined
): SelectedGameLayoutConfig {
  const preview = asRecord(document?.preview);
  const sampleGameRef = asRecord(preview.sampleGameRef);
  return {
    layoutControls: asRecord(document?.layoutControls),
    contentPlan: document?.contentPlan ?? DEFAULT_SELECTED_GAME_CONTENT_PLAN,
    previewSampleGameId: asString(sampleGameRef.gameId) || 'claim',
    debugBounds: preview.debugBounds === true,
  };
}

export async function loadSelectedGameLayoutFromDisk(
  assetPath = SELECTED_GAME_LAYOUT_ASSET_PATH
): Promise<{
  envelope: AssetEnvelope;
  config: SelectedGameLayoutConfig;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  return {
    envelope,
    config: normalizeSelectedGameLayoutConfig(envelope.data),
  };
}

export async function saveSelectedGameLayoutToDisk(
  config: SelectedGameLayoutConfig,
  assetPath = SELECTED_GAME_LAYOUT_ASSET_PATH
): Promise<SelectedGameLayoutAssetDocument> {
  const { envelope } = await loadSelectedGameLayoutFromDisk(assetPath);
  const previousPreview = asRecord(envelope.data.preview);
  const previousSampleRef = asRecord(previousPreview.sampleGameRef);
  const nextDocument: SelectedGameLayoutAssetDocument = {
    ...envelope.data,
    layoutControls: config.layoutControls,
    contentPlan: config.contentPlan,
    preview: {
      ...previousPreview,
      sampleGameRef: {
        ...previousSampleRef,
        gameId: config.previewSampleGameId || 'claim',
        guid: asString(previousSampleRef.guid),
        path: asString(previousSampleRef.path),
      },
      debugBounds: config.debugBounds,
    },
  };
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ ...envelope, data: nextDocument }, null, 2)}\n`
  );
  await writeAsset(assetPath, payload);
  return nextDocument;
}
