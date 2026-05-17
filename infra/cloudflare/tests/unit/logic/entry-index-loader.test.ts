import { afterEach, vi } from 'vitest';
import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import type { Env } from '@/constants/env';
import { resolveAssetR2Key } from '@/logic/assets/assets';
import { clearEntryIndexRuntimeCache, readEntryIndex } from '@/logic/assets/entry-index-loader';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';

const TestEntryIndex = {
  Guid: 'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee',
  R2Path: 'Games/claim/info.asset',
  Etag: 'entry-etag-1',
} as const;

function createEntryIndexText(): string {
  return JSON.stringify({
    generatedAt: '2026-05-15T00:00:00.000Z',
    resources: [
      {
        resourceEntryType: 'AssetResourceEntry',
        path: `Resources/${TestEntryIndex.R2Path}`,
        guid: TestEntryIndex.Guid,
        assetType: 'GameInfo',
      },
    ],
    games: [],
  });
}

function createEnv(entryIndexText: string, etag: string): {
  env: Env;
  get: ReturnType<typeof vi.fn>;
  head: ReturnType<typeof vi.fn>;
} {
  const head = vi.fn(async (key: string) => {
    if (key === AssetContentSlicePath.EntryIndex) {
      return { etag };
    }
    return null;
  });
  const get = vi.fn(async (key: string) => {
    if (key !== AssetContentSlicePath.EntryIndex) {
      return null;
    }
    return {
      etag,
      text: vi.fn(async () => entryIndexText),
    };
  });
  const env = {
    ASSETS_BUCKET: {
      get,
      head,
    },
  } as unknown as Env;
  return { env, get, head };
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterEach(() => {
    clearEntryIndexRuntimeCache();
  });

  it(testName('coalesces concurrent entry index loads for identifier resolution'), async () => {
    const { env, get, head } = createEnv(createEntryIndexText(), TestEntryIndex.Etag);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => resolveAssetR2Key(env, { guid: TestEntryIndex.Guid }))
    );

    expect(results).toEqual(Array.from({ length: 5 }, () => TestEntryIndex.R2Path));
    expect(get.mock.calls.filter(([key]) => key === AssetContentSlicePath.EntryIndex)).toHaveLength(1);
    expect(head.mock.calls.filter(([key]) => key === AssetContentSlicePath.EntryIndex)).toHaveLength(1);
  });

  it(testName('serves warm entry index reads without repeated R2 calls'), async () => {
    const { env, get, head } = createEnv(createEntryIndexText(), TestEntryIndex.Etag);

    const first = await readEntryIndex(env);
    get.mockClear();
    head.mockClear();

    const second = await readEntryIndex(env);

    expect(first?.resources[0]?.guid).toBe(TestEntryIndex.Guid);
    expect(second?.resources[0]?.guid).toBe(TestEntryIndex.Guid);
    expect(get).not.toHaveBeenCalled();
    expect(head).not.toHaveBeenCalled();
  });
});
