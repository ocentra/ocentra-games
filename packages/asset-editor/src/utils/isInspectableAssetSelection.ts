import { CardGameLayout } from '@ocentra/game-asset-domain/ui/layout/CardGameLayout';
import { Layout } from '@ocentra/game-asset-domain/ui/layout/Layout';

type InspectableAssetData = {
  system?: {
    assetType?: string;
  };
  metadata?: {
    assetType?: string;
  };
} | null;

const assetInspectorRequirements = new Map<string, boolean>([
  [Layout.name, Layout.requiresInspector],
  [CardGameLayout.name, CardGameLayout.requiresInspector],
]);

function assetTypeRequiresInspector(assetType: string | null | undefined): boolean {
  if (!assetType) {
    return true;
  }

  return assetInspectorRequirements.get(assetType) ?? true;
}

function pathLooksLikeLayoutAsset(assetPath: string): boolean {
  return assetPath.toLowerCase().endsWith('layout.asset');
}

export function isInspectableAssetSelection(
  assetPath: string | null,
  assetData: InspectableAssetData,
): boolean {
  if (!assetPath) return false;
  if (assetPath.startsWith('virtual:AssetCatalog')) return false;
  if (pathLooksLikeLayoutAsset(assetPath)) return false;

  const assetType = assetData?.system?.assetType ?? assetData?.metadata?.assetType ?? null;
  if (assetType === 'AssetCatalog') return false;

  return assetTypeRequiresInspector(assetType);
}
