import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import {
  normalizeShopPageSvgControls,
  type ShopPageSvgControls,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const SHOP_PAGE_LAYOUT_ASSET_PATH =
  'Resources/Pages/ShopPageLayout.asset';

export interface ShopPageLayoutAssetDocument extends PageLayoutDocument {
  shopControls?: Partial<ShopPageSvgControls>;
}

interface AssetEnvelope {
  system: Record<string, unknown>;
  data: ShopPageLayoutAssetDocument;
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
    data: asRecord(record.data) as unknown as ShopPageLayoutAssetDocument,
  };
}

export function normalizeShopPageLayoutControls(
  document: Partial<ShopPageLayoutAssetDocument> | null | undefined
): ShopPageSvgControls {
  return normalizeShopPageSvgControls(document?.shopControls);
}

export async function loadShopPageLayoutControlsFromDisk(
  assetPath = SHOP_PAGE_LAYOUT_ASSET_PATH
): Promise<{
  envelope: AssetEnvelope;
  controls: ShopPageSvgControls;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  return {
    envelope,
    controls: normalizeShopPageLayoutControls(envelope.data),
  };
}

export async function saveShopPageLayoutControlsToDisk(
  controls: ShopPageSvgControls,
  assetPath = SHOP_PAGE_LAYOUT_ASSET_PATH
): Promise<ShopPageSvgControls> {
  const { envelope } = await loadShopPageLayoutControlsFromDisk(assetPath);
  const normalizedControls = normalizeShopPageSvgControls(controls);
  const nextDocument: ShopPageLayoutAssetDocument = {
    ...envelope.data,
    shopControls: normalizedControls,
  };
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ ...envelope, data: nextDocument }, null, 2)}\n`
  );
  await writeAsset(assetPath, payload);
  return normalizedControls;
}
