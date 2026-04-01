import { describe, expect, it } from 'vitest';
import type { AssetTypeInfo } from '@ocentra/game-asset-domain/constants/asset-type-info';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import {
  getAuthorableAssetTypes,
  isAuthorableAssetTypeInfo,
} from '@/lib/validation/authorableAssetTypes';

function createTypeInfo(
  assetType: string,
  category: keyof typeof AssetTypeCategory = 'Content'
): AssetTypeInfo {
  return {
    assetType,
    displayName: assetType,
    icon: 'x',
    constructor: class {} as unknown as AssetTypeInfo['constructor'],
    createTemplate: () => ({}),
    category: AssetTypeCategory[category],
  };
}

describe('authorableAssetTypes', () => {
  it('isAuthorableAssetTypeInfo: excludes infrastructure and abstract types from the create dialog', () => {
    expect(isAuthorableAssetTypeInfo(createTypeInfo('AssetResourceEntry'))).toBe(false);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('ResourceEntry'))).toBe(false);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('CardRankingEntry', 'Game'))).toBe(false);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('BaseRule', 'Game'))).toBe(false);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('GameMode', 'Game'))).toBe(false);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('Layout', 'UI'))).toBe(false);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('AssetRegistry'))).toBe(false);
  });

  it('isAuthorableAssetTypeInfo: excludes AI types (edited in main app, not editor)', () => {
    expect(isAuthorableAssetTypeInfo(createTypeInfo('AIModelList', 'AI'))).toBe(false);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('ModelQuantSettings', 'AI'))).toBe(false);
  });

  it('isAuthorableAssetTypeInfo: keeps real top-level asset types available', () => {
    expect(isAuthorableAssetTypeInfo(createTypeInfo('GameInfo'))).toBe(true);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('CardGameMode', 'Game'))).toBe(true);
    expect(isAuthorableAssetTypeInfo(createTypeInfo('CardGameLayout', 'UI'))).toBe(true);
  });

  it('getAuthorableAssetTypes: filters by both authorability and category', () => {
    const allTypes = [
      createTypeInfo('AssetResourceEntry'),
      createTypeInfo('GameInfo'),
      createTypeInfo('AIModelList', 'AI'),
      createTypeInfo('CardGameMode', 'Game'),
      createTypeInfo('AssetRegistry'),
    ];

    expect(getAuthorableAssetTypes(allTypes, 'All').map((typeInfo) => typeInfo.assetType)).toEqual([
      'GameInfo',
      'CardGameMode',
    ]);

    expect(getAuthorableAssetTypes(allTypes, AssetTypeCategory.AI).map((typeInfo) => typeInfo.assetType)).toEqual(
      []
    );
  });
});
