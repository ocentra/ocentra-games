import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import {
  normalizeAuthPageSvgControls,
  type AuthPageSvgControls,
} from '@ocentra/core-ui/Auth/CyberAuthSurface';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const AUTH_PAGE_LAYOUT_ASSET_PATH =
  'Resources/Pages/AuthPageLayout.asset';

export interface AuthPageLayoutAssetDocument extends PageLayoutDocument {
  authControls?: Partial<AuthPageSvgControls>;
}

interface AssetEnvelope {
  system: Record<string, unknown>;
  data: AuthPageLayoutAssetDocument;
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
    data: asRecord(record.data) as unknown as AuthPageLayoutAssetDocument,
  };
}

export function normalizeAuthPageLayoutControls(
  document: Partial<AuthPageLayoutAssetDocument> | null | undefined
): AuthPageSvgControls {
  return normalizeAuthPageSvgControls(document?.authControls);
}

export async function loadAuthPageLayoutControlsFromDisk(
  assetPath = AUTH_PAGE_LAYOUT_ASSET_PATH
): Promise<{
  envelope: AssetEnvelope;
  controls: AuthPageSvgControls;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  return {
    envelope,
    controls: normalizeAuthPageLayoutControls(envelope.data),
  };
}

export async function saveAuthPageLayoutControlsToDisk(
  controls: AuthPageSvgControls,
  assetPath = AUTH_PAGE_LAYOUT_ASSET_PATH
): Promise<AuthPageSvgControls> {
  const { envelope } = await loadAuthPageLayoutControlsFromDisk(assetPath);
  const normalizedControls = normalizeAuthPageSvgControls(controls);
  const nextDocument: AuthPageLayoutAssetDocument = {
    ...envelope.data,
    authControls: normalizedControls,
  };
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ ...envelope, data: nextDocument }, null, 2)}\n`
  );
  await writeAsset(assetPath, payload);
  return normalizedControls;
}
