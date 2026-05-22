import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import {
  normalizeLeaderboardPageSvgControls,
  type LeaderboardPageSvgControls,
} from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgSurfaceControls';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const LEADERBOARD_PAGE_LAYOUT_ASSET_PATH =
  'Resources/Pages/LeaderboardPageLayout.asset';

export interface LeaderboardPageLayoutAssetDocument extends PageLayoutDocument {
  leaderboardControls?: Partial<LeaderboardPageSvgControls>;
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

export async function loadLeaderboardPageLayoutControlsFromDisk(
  assetPath = LEADERBOARD_PAGE_LAYOUT_ASSET_PATH
): Promise<{
  envelope: AssetEnvelope;
  controls: LeaderboardPageSvgControls;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  return {
    envelope,
    controls: normalizeLeaderboardPageLayoutControls(envelope.data),
  };
}

export async function saveLeaderboardPageLayoutControlsToDisk(
  controls: LeaderboardPageSvgControls,
  assetPath = LEADERBOARD_PAGE_LAYOUT_ASSET_PATH
): Promise<LeaderboardPageSvgControls> {
  const { envelope } = await loadLeaderboardPageLayoutControlsFromDisk(assetPath);
  const normalizedControls = normalizeLeaderboardPageSvgControls(controls);
  const nextDocument: LeaderboardPageLayoutAssetDocument = {
    ...envelope.data,
    leaderboardControls: normalizedControls,
  };
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ ...envelope, data: nextDocument }, null, 2)}\n`
  );
  await writeAsset(assetPath, payload);
  return normalizedControls;
}
