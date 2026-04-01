import JSON5 from 'json5';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { asGameId } from '@ocentra/asset-domain/types/assetIdentifier';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { createTestEventBus } from '@ocentra/eventing-domain/testing/createTestEventBus';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets/GetResourceEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';

describe('LayoutAssetService', () => {
  beforeEach(() => {
    EventBus.instance = createTestEventBus();
  });

  afterEach(() => {
    EventBus.reset();
  });

  function wireHarness() {
    const gameModeEntry = AssetResourceEntry.fromGuid(
      'game-mode-guid',
      asAssetType('CardGameMode'),
      'Claim'
    );
    gameModeEntry.gameId = asGameId('claim');

    const gameModeAsset = {
      system: {
        guid: 'game-mode-guid',
        assetType: 'CardGameMode',
        displayName: 'Claim',
        gameId: 'claim',
      },
      data: {
        layoutAsset: {
          guid: 'layout-guid',
          path: 'Resources/GameMode/CardGames/claim/claimLayout.asset',
          displayName: 'Layout',
        },
      },
    };

    const layoutAsset = {
      system: {
        guid: 'layout-guid',
        assetType: 'CardGameLayout',
        displayName: 'Layout',
        category: 'UI',
        gameId: 'claim',
        treePath: 'Resources/GameMode/CardGames/claim/claimLayout.asset',
      },
      data: {
        defaultPlayerCount: 4,
        presets: {
          '4': {
            table: { width: 960, height: 560, offsetX: 0, offsetY: 0, curvature: 0.88, feltInset: -8 },
            seats: [
              { id: 0, label: 'p1', position: { x: 0.5, y: 0.1 }, rotation: 0, scale: 0.5 },
            ],
          },
        },
        gameplay: { mode: 'standard' },
        extensions: { theme: 'classic' },
      },
    };

    let uploadedContent = '';

    EventBus.instance.subscribeAsync(GetGameModeEntriesEvent, async (event) => {
      event.deferred.resolve(OperationResult.success([gameModeEntry]));
    });

    EventBus.instance.subscribeAsync(GetResourceEvent, async (event) => {
      if (event.request.guid === 'game-mode-guid') {
        event.deferred.resolve(OperationResult.success(new Response(JSON5.stringify(gameModeAsset, null, 2))));
        return;
      }
      if (event.request.guid === 'layout-guid') {
        event.deferred.resolve(OperationResult.success(new Response(JSON5.stringify(layoutAsset, null, 2))));
        return;
      }
      event.deferred.resolve(OperationResult.failure(`Unexpected guid ${event.request.guid}`));
    });

    EventBus.instance.subscribeAsync(GetResourceByGuidEvent, async (event) => {
      event.deferred.resolve(OperationResult.success({
        guid: 'layout-guid',
        path: 'Resources/GameMode/CardGames/claim/claimLayout.asset',
        displayName: 'Layout',
      } as never));
    });

    EventBus.instance.subscribeAsync(UploadAssetEvent, async (event) => {
      uploadedContent = event.content;
      event.deferred.resolve(OperationResult.success({
        guid: event.guid,
        type: 'CardGameLayout',
        displayName: 'Layout',
        category: 'UI',
        gameId: 'claim',
        path: 'Resources/GameMode/CardGames/claim/claimLayout.asset',
        metaPath: null,
        checksum: 'checksum',
        mimeType: 'application/json',
        fileSize: event.content.length,
        createdAt: '2026-03-07T00:00:00.000Z',
        updatedAt: '2026-03-07T00:00:00.000Z',
        lastScanAt: '2026-03-07T00:00:00.000Z',
        inheritanceChain: ['Layout'],
      }));
    });

    return {
      getUploadedContent: () => uploadedContent,
    };
  }

  it('loads the layout asset for a game through the editor runtime', async () => {
    wireHarness();
    const { loadLayoutAsset } = await import('@/adapters/layout/LayoutAssetService');

    const result = await loadLayoutAsset('claim');

    expect(result.guid).toBe('layout-guid');
    expect(result.path).toBe('Resources/GameMode/CardGames/claim/claimLayout.asset');
    expect(result.document.defaultPlayerCount).toBe(4);
    expect(result.document.presets['4']?.seats).toHaveLength(1);
    expect(result.document.gameplay).toEqual({ mode: 'standard' });
  });

  it('saves updated layout documents back through UploadAssetEvent', async () => {
    const harness = wireHarness();
    const { loadLayoutAsset, saveLayoutAsset } = await import('@/adapters/layout/LayoutAssetService');

    const loaded = await loadLayoutAsset('claim');
    const saved = await saveLayoutAsset(loaded, {
      ...loaded.document,
      defaultPlayerCount: 6,
      gameplay: { mode: 'expanded' },
    });

    const uploaded = JSON5.parse(harness.getUploadedContent()) as Record<string, unknown>;
    const uploadedSystem = uploaded.system as Record<string, unknown>;
    const uploadedData = uploaded.data as Record<string, unknown>;

    expect(saved.document.defaultPlayerCount).toBe(6);
    expect(uploadedSystem.gameId).toBe('claim');
    expect(uploadedSystem.treePath).toBe('Resources/GameMode/CardGames/claim/claimLayout.asset');
    expect(uploadedData.defaultPlayerCount).toBe(6);
    expect(uploadedData.gameplay).toEqual({ mode: 'expanded' });
  });
});
