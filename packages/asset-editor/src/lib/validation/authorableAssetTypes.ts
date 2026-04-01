import type { AssetCategory } from '@ocentra/asset-domain/constants/assets';
import type { AssetTypeInfo } from '@ocentra/game-asset-domain/constants/asset-type-info';
import { assetTypeMap } from '@/lib/core/registry/assetTypeMap.generated';

const NON_AUTHORABLE_IMPORT_PATHS = new Set([
  '@ocentra/game-asset-domain/BaseAssetMetadata',
  '@ocentra/game-asset-domain/game/rules/BaseBonusRule',
  '@ocentra/game-asset-domain/game/rules/BaseRule',
  '@ocentra/game-asset-domain/gameMode/core/GameMode',
  '@ocentra/game-asset-domain/gameMode/core/TurnBasedGameMode',
  '@ocentra/game-asset-domain/assetRegistry/AssetRegistry',
  '@ocentra/game-asset-domain/ui/layout/Layout',
]);

const NON_AUTHORABLE_ASSET_TYPES = new Set([
  'AIModelList',
  'BaseAssetMetadata',
  'BaseBonusRule',
  'BaseRule',
  'GameMode',
  'Layout',
  'AssetRegistry',
  'ModelQuantSettings',
  'TurnBasedGameMode',
]);

export function isAuthorableAssetTypeInfo(typeInfo: AssetTypeInfo): boolean {
  const metadata = assetTypeMap[typeInfo.assetType];
  if (!metadata) {
    return false;
  }

  if (metadata.importPath.startsWith('@ocentra/asset-domain/resourceEntry/')) {
    return false;
  }

  if (NON_AUTHORABLE_IMPORT_PATHS.has(metadata.importPath)) {
    return false;
  }

  if (NON_AUTHORABLE_ASSET_TYPES.has(typeInfo.assetType)) {
    return false;
  }

  if (typeInfo.assetType.endsWith('Entry')) {
    return false;
  }

  return true;
}

export function getAuthorableAssetTypes(
  allTypes: AssetTypeInfo[],
  category: AssetCategory | 'All'
): AssetTypeInfo[] {
  return allTypes.filter((typeInfo) => {
    if (!isAuthorableAssetTypeInfo(typeInfo)) {
      return false;
    }

    if (category === 'All') {
      return true;
    }

    return typeInfo.category === category;
  });
}
