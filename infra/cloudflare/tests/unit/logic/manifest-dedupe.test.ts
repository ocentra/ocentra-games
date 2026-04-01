import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { dedupeResourcesByGuid } from '@/logic/assets/manifest-loader';
import type { ManifestResourceEntry } from '@/logic/assets/manifest-loader';

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  it(testName('dedupeResourcesByGuid: keeps entry with more path segments when same GUID'), () => {
    const guid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const resources: ManifestResourceEntry[] = [
      { path: 'Resources/StandardCardRanking.asset', guid, resourceEntryType: 'AssetResourceEntry' },
      { path: 'Resources/GameMode/CardGames/CardRanking/StandardCardRanking.asset', guid, resourceEntryType: 'AssetResourceEntry' },
    ];
    const result = dedupeResourcesByGuid(resources);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('Resources/GameMode/CardGames/CardRanking/StandardCardRanking.asset');
  });

  it(testName('dedupeResourcesByGuid: leaves entries without GUID unchanged'), () => {
    const resources: ManifestResourceEntry[] = [
      { path: 'Resources/Images/abc123.png', hash: 'abc123', resourceEntryType: 'ImageResourceEntry' },
      { path: 'Resources/file.txt', checksum: 'def456', resourceEntryType: 'FileResourceEntry' },
    ];
    const result = dedupeResourcesByGuid(resources);
    expect(result).toHaveLength(2);
  });

  it(testName('dedupeResourcesByGuid: mixes GUID and non-GUID entries correctly'), () => {
    const guid = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    const resources: ManifestResourceEntry[] = [
      { path: 'Resources/dup.asset', guid, resourceEntryType: 'AssetResourceEntry' },
      { path: 'Resources/folder/dup.asset', guid, resourceEntryType: 'AssetResourceEntry' },
      { path: 'Resources/Images/x.png', hash: 'xyz', resourceEntryType: 'ImageResourceEntry' },
    ];
    const result = dedupeResourcesByGuid(resources);
    expect(result).toHaveLength(2);
    const assetEntry = result.find((r: ManifestResourceEntry) => r.guid === guid);
    expect(assetEntry?.path).toBe('Resources/folder/dup.asset');
  });
});
