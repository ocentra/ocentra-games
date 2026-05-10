import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import {
  normalizeLobbyPageSvgControls,
  type LobbyPageSvgControls,
} from '@ocentra/core-ui/AppPages/Lobby/LobbyPageSvgSurfaceControls';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const LOBBY_PAGE_LAYOUT_ASSET_PATH =
  'Resources/Pages/LobbyPageLayout.asset';

export interface LobbyPageLayoutAssetDocument extends PageLayoutDocument {
  lobbyControls?: Partial<LobbyPageSvgControls>;
}

interface AssetEnvelope {
  system: Record<string, unknown>;
  data: LobbyPageLayoutAssetDocument;
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
    data: asRecord(record.data) as unknown as LobbyPageLayoutAssetDocument,
  };
}

export function normalizeLobbyPageLayoutControls(
  document: Partial<LobbyPageLayoutAssetDocument> | null | undefined
): LobbyPageSvgControls {
  return normalizeLobbyPageSvgControls(document?.lobbyControls);
}

export async function loadLobbyPageLayoutControlsFromDisk(
  assetPath = LOBBY_PAGE_LAYOUT_ASSET_PATH
): Promise<{
  envelope: AssetEnvelope;
  controls: LobbyPageSvgControls;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  return {
    envelope,
    controls: normalizeLobbyPageLayoutControls(envelope.data),
  };
}

export async function saveLobbyPageLayoutControlsToDisk(
  controls: LobbyPageSvgControls,
  assetPath = LOBBY_PAGE_LAYOUT_ASSET_PATH
): Promise<LobbyPageSvgControls> {
  const { envelope } = await loadLobbyPageLayoutControlsFromDisk(assetPath);
  const normalizedControls = normalizeLobbyPageSvgControls(controls);
  const nextDocument: LobbyPageLayoutAssetDocument = {
    ...envelope.data,
    lobbyControls: normalizedControls,
  };
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ ...envelope, data: nextDocument }, null, 2)}\n`
  );
  await writeAsset(assetPath, payload);
  return normalizedControls;
}
