import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { GetResourceByHashEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByHashEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import JSON5 from 'json5';
import { useInspectorPanel } from '@/pages/InspectorPanel/useInspectorPanel';

vi.mock('@/lib/cache/EditorImageCache', () => ({
  EditorImageCache: {
    getInstance: () => ({
      getCachedImageByHash: vi.fn(async () => null),
    }),
  },
  ImageVariant: { Full: 'full', Icon: 'icon' },
}));

vi.mock('@/adapters/assets/AssetLoader', () => ({
  AssetLoader: {
    getInstance: () => ({
      resolveImageUrlByHash: vi.fn(async () => 'blob:test'),
    }),
  },
}));

describe('useInspectorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());

    EventBus.instance = {
      publishAsync: vi.fn(async (event: unknown) => {
        if (event instanceof GetResourceByGuidEvent || event instanceof GetResourceByHashEvent) {
          event.deferred.resolve(OperationResult.success(null));
          return;
        }

        if (event instanceof UploadAssetEvent) {
          event.deferred.resolve(
            OperationResult.success({
              guid: event.guid,
              type: event.metadata.assetType,
              displayName: event.metadata.displayName,
              category: event.metadata.category,
              gameId: event.metadata.gameId ?? null,
              path: 'Resources/GameInfo/test.asset',
              metaPath: null,
              checksum: 'checksum',
              mimeType: event.metadata.mimeType,
              fileSize: event.metadata.fileSize,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastScanAt: new Date().toISOString(),
              inheritanceChain: null,
            })
          );
        }
      }),
      publish: vi.fn(),
    } as unknown as EventBus;
  });

  it('handleSave: uploads edited content using system metadata and updates the asset', async () => {
    const onAssetUpdate = vi.fn();
    const assetData = {
      system: {
        guid: 'guid-1',
        assetType: 'GameInfo',
        displayName: 'Original Display',
        category: 'Game',
      },
      metadata: {
        assetType: 'GameInfo',
        assetId: 'Original Display',
      },
      data: {
        title: 'Original Title',
      },
    };

    const { result } = renderHook(() =>
      useInspectorPanel({
        assetGuid: 'guid-1',
        assetData: assetData as never,
        onAssetUpdate,
      })
    );

    await waitFor(() => {
      expect(result.current.editedData).not.toBeNull();
    });

    act(() => {
      result.current.handleFieldChange('title', 'Updated Title');
    });

    await act(async () => {
      await result.current.handleSave('guid-1');
    });

    const publishAsyncMock = EventBus.instance.publishAsync as unknown as ReturnType<typeof vi.fn>;
    const uploadCall = publishAsyncMock.mock.calls.find(([event]) => event instanceof UploadAssetEvent);
    const uploadEvent = uploadCall?.[0] as UploadAssetEvent | undefined;

    expect(uploadEvent).toBeDefined();
    expect(uploadEvent?.metadata).toEqual({
      assetType: 'GameInfo',
      displayName: 'Original Display',
      category: 'Game',
      mimeType: 'application/json',
      fileSize: expect.any(Number),
    });
    expect(JSON5.parse(uploadEvent?.content ?? '{}')).toMatchObject({
      system: {
        guid: 'guid-1',
        assetType: 'GameInfo',
        displayName: 'Original Display',
      },
      data: {
        title: 'Updated Title',
      },
    });
    expect(onAssetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Updated Title',
        }),
      })
    );
  });
});
