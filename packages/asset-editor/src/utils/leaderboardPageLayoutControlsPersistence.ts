import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import {
  normalizeLeaderboardPageContent,
  type LeaderboardPageContentData,
  type PartialLeaderboardPageContentData,
} from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgContent';
import {
  normalizeLeaderboardPageSvgControls,
  type LeaderboardPageSvgControls,
} from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgSurfaceControls';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const LEADERBOARD_PAGE_LAYOUT_ASSET_PATH =
  'Resources/Pages/LeaderboardPageLayout.asset';

export interface LeaderboardPageLayoutAssetDocument extends PageLayoutDocument {
  leaderboardControls?: Partial<LeaderboardPageSvgControls>;
  leaderboardContent?: PartialLeaderboardPageContentData;
}

interface AssetEnvelope {
  system: Record<string, unknown>;
  data: LeaderboardPageLayoutAssetDocument;
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
    data: asRecord(record.data) as unknown as LeaderboardPageLayoutAssetDocument,
  };
}

export function normalizeLeaderboardPageLayoutControls(
  document: Partial<LeaderboardPageLayoutAssetDocument> | null | undefined
): LeaderboardPageSvgControls {
  return normalizeLeaderboardPageSvgControls(document?.leaderboardControls);
}

export function normalizeLeaderboardPageLayoutContent(
  document: Partial<LeaderboardPageLayoutAssetDocument> | null | undefined
): LeaderboardPageContentData {
  return normalizeLeaderboardPageContent(document?.leaderboardContent);
}

export async function loadLeaderboardPageLayoutControlsFromDisk(
  assetPath = LEADERBOARD_PAGE_LAYOUT_ASSET_PATH
): Promise<{
  envelope: AssetEnvelope;
  controls: LeaderboardPageSvgControls;
  content: LeaderboardPageContentData;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  return {
    envelope,
    controls: normalizeLeaderboardPageLayoutControls(envelope.data),
    content: normalizeLeaderboardPageLayoutContent(envelope.data),
  };
}

export async function saveLeaderboardPageLayoutControlsToDisk(
  controls: LeaderboardPageSvgControls,
  content: LeaderboardPageContentData,
  assetPath = LEADERBOARD_PAGE_LAYOUT_ASSET_PATH
): Promise<{
  controls: LeaderboardPageSvgControls;
  content: LeaderboardPageContentData;
}> {
  const { envelope } = await loadLeaderboardPageLayoutControlsFromDisk(assetPath);
  const normalizedControls = normalizeLeaderboardPageSvgControls(controls);
  const normalizedContent = normalizeLeaderboardPageContent(content);
  const nextDocument: LeaderboardPageLayoutAssetDocument = {
    ...envelope.data,
    leaderboardControls: normalizedControls,
    leaderboardContent: normalizedContent,
  };
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ ...envelope, data: nextDocument }, null, 2)}\n`
  );
  await writeAsset(assetPath, payload);
  return {
    controls: normalizedControls,
    content: normalizedContent,
  };
}
