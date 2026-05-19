import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import {
  normalizeShopPageSvgControls,
  type ShopPageSvgControls,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';
import {
  normalizeShopPageContent,
  type ShopPageContentData,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const SHOP_PAGE_LAYOUT_ASSET_PATH =
  'Resources/Pages/ShopPageLayout.asset';

export type ShopPageLayoutAssetDocument = PageLayoutDocument;

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

export function normalizeShopPageLayoutContent(
  document: Partial<ShopPageLayoutAssetDocument> | null | undefined
): ShopPageContentData {
  return normalizeShopPageContent(document?.shopContent);
}

export async function loadShopPageLayoutControlsFromDisk(
  assetPath = SHOP_PAGE_LAYOUT_ASSET_PATH
): Promise<{
  envelope: AssetEnvelope;
  controls: ShopPageSvgControls;
  content: ShopPageContentData;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  return {
    envelope,
    controls: normalizeShopPageLayoutControls(envelope.data),
    content: normalizeShopPageLayoutContent(envelope.data),
  };
}

export async function saveShopPageLayoutControlsToDisk(
  controls: ShopPageSvgControls,
  content?: ShopPageContentData,
  assetPath = SHOP_PAGE_LAYOUT_ASSET_PATH
): Promise<ShopPageSvgControls> {
  const { envelope } = await loadShopPageLayoutControlsFromDisk(assetPath);
  const normalizedControls = normalizeShopPageSvgControls(controls);
  const normalizedContent = content ? normalizeShopPageContent(content) : normalizeShopPageLayoutContent(envelope.data);
  const nextDocument: ShopPageLayoutAssetDocument = {
    ...envelope.data,
    shopControls: normalizedControls,
    shopContent: normalizedContent,
  };
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ ...envelope, data: nextDocument }, null, 2)}\n`
  );
  await writeAsset(assetPath, payload);
  return normalizedControls;
}
