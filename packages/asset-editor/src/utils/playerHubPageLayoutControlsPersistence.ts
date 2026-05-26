import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import {
  normalizePlayerHubPageSvgControls,
  type PlayerHubPageSvgControls,
} from '@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageSvgSurfaceControls';
import {
  normalizePlayerHubPageContent,
  type PartialPlayerHubPageContentData,
  type PlayerHubPageContentData,
} from '@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageSvgContent';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const PLAYER_HUB_PAGE_LAYOUT_ASSET_PATH =
  'Resources/Pages/PlayerHubPageLayout.asset';

export interface PlayerHubPageLayoutAssetDocument extends PageLayoutDocument {
  playerHubControls?: Partial<PlayerHubPageSvgControls>;
  playerHubContent?: PartialPlayerHubPageContentData;
}

interface AssetEnvelope {
  system: Record<string, unknown>;
  data: PlayerHubPageLayoutAssetDocument;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeEnvelope(value: unknown): AssetEnvelope {
  const record = asRecord(value);
  return {
    system: asRecord(record.system),
    data: asRecord(record.data) as unknown as PlayerHubPageLayoutAssetDocument,
  };
}

export function normalizePlayerHubPageLayoutControls(
  document: Partial<PlayerHubPageLayoutAssetDocument> | null | undefined,
): PlayerHubPageSvgControls {
  return normalizePlayerHubPageSvgControls(document?.playerHubControls);
}

export function normalizePlayerHubPageLayoutContent(
  document: Partial<PlayerHubPageLayoutAssetDocument> | null | undefined,
): PlayerHubPageContentData {
  return normalizePlayerHubPageContent(document?.playerHubContent);
}

export async function loadPlayerHubPageLayoutControlsFromDisk(
  assetPath = PLAYER_HUB_PAGE_LAYOUT_ASSET_PATH,
): Promise<{
  envelope: AssetEnvelope;
  controls: PlayerHubPageSvgControls;
  content: PlayerHubPageContentData;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  return {
    envelope,
    controls: normalizePlayerHubPageLayoutControls(envelope.data),
    content: normalizePlayerHubPageLayoutContent(envelope.data),
  };
}

export async function savePlayerHubPageLayoutControlsToDisk(
  controls: PlayerHubPageSvgControls,
  content?: PlayerHubPageContentData,
  assetPath = PLAYER_HUB_PAGE_LAYOUT_ASSET_PATH,
): Promise<PlayerHubPageSvgControls> {
  const { envelope } = await loadPlayerHubPageLayoutControlsFromDisk(assetPath);
  const normalizedControls = normalizePlayerHubPageSvgControls(controls);
  const normalizedContent = normalizePlayerHubPageContent(content ?? envelope.data.playerHubContent);
  const nextDocument: PlayerHubPageLayoutAssetDocument = {
    ...envelope.data,
    playerHubControls: normalizedControls,
    playerHubContent: normalizedContent,
  };
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ ...envelope, data: nextDocument }, null, 2)}\n`,
  );
  await writeAsset(assetPath, payload);
  return normalizedControls;
}
