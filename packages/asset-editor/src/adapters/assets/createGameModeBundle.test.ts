import JSON5 from 'json5';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { createTestEventBus } from '@ocentra/eventing-domain/testing/createTestEventBus';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { validateAssetFile } from '@ocentra/game-asset-domain/schemas/asset/asset-file-schema';

const uuidSequence = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000007',
  '00000000-0000-4000-8000-000000000008',
  '00000000-0000-4000-8000-000000000009',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000014',
  '00000000-0000-4000-8000-000000000015',
  '00000000-0000-4000-8000-000000000016',
  '00000000-0000-4000-8000-000000000017',
  '00000000-0000-4000-8000-000000000018',
  '00000000-0000-4000-8000-000000000019',
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000023',
  '00000000-0000-4000-8000-000000000024',
];

const requiredAssetTypes = [
  'CardGameMode',
  'CardGameRules',
  'Strategy',
  'CardGameScoring',
  'GameInfo',
  'CardGameLayout',
  'ImageCarousel',
  'CardGameMechanics',
  'GamePlayerModel',
  'GameSessionModel',
  'CardGameDeckModel',
  'GameZoneModel',
  'GamePhaseFlowModel',
  'GameActionSet',
  'GameStateEventModel',
  'GameValidationFixtures',
] as const;

function formatValidationResult(result: ReturnType<typeof validateAssetFile>): string {
  if (result.success) {
    return 'valid';
  }
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const threeCardBragPath = path.join(repoRoot, 'packages/card-games/src/processed-games/vying/brag-3-card.json');

describe('createGameModeBundle', () => {
  const originalCrypto = globalThis.crypto;

  beforeEach(() => {
    EventBus.instance = createTestEventBus();
    let index = 0;
    EventBus.instance.subscribeAsync(GenerateUniqueGuidEvent, async (event) => {
      const nextGuid = uuidSequence[index++] ?? originalCrypto.randomUUID();
      event.deferred.resolve(OperationResult.success(nextGuid));
    });
  });

  afterEach(() => {
    EventBus.reset();
  });

  it('builds the full standalone game asset set with stable paths', async () => {
    const { createGameModeBundle } = await import('@/adapters/assets/createGameModeBundle');

    const bundle = await createGameModeBundle({
      gameId: 'Claim',
      displayName: 'Claim',
      category: 'CardGames',
    });

    expect(bundle.files).toHaveLength(16);
    expect(bundle.mainAssetGuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(bundle.mainAssetPath).toBe('Resources/GameMode/CardGames/claim/claim.asset');

    const paths = bundle.files.map((file) => file.path).sort();
    const expectedPaths = [
      'Resources/GameMode/CardGames/claim/claim.asset',
      'Resources/GameMode/CardGames/claim/claimCarousel.asset',
      'Resources/GameMode/CardGames/claim/info.asset',
      'Resources/GameMode/CardGames/claim/claimLayout.asset',
      'Resources/GameMode/CardGames/claim/claimMechanics.asset',
      'Resources/GameMode/CardGames/claim/claimPlayerModel.asset',
      'Resources/GameMode/CardGames/claim/claimSessionModel.asset',
      'Resources/GameMode/CardGames/claim/claimDeckModel.asset',
      'Resources/GameMode/CardGames/claim/claimZoneModel.asset',
      'Resources/GameMode/CardGames/claim/claimPhaseFlowModel.asset',
      'Resources/GameMode/CardGames/claim/claimActionSet.asset',
      'Resources/GameMode/CardGames/claim/claimStateEventModel.asset',
      'Resources/GameMode/CardGames/claim/claimValidationFixtures.asset',
      'Resources/GameMode/CardGames/claim/claimRules.asset',
      'Resources/GameMode/CardGames/claim/claimScoring.asset',
      'Resources/GameMode/CardGames/claim/claimStrategy.asset',
    ].sort();
    expect(paths).toEqual(expectedPaths);

    const mainAsset = bundle.files.find((file) => file.path.endsWith('/claim.asset'));
    expect(mainAsset).toBeDefined();
    expect(mainAsset?.metadata.assetType).toBe('CardGameMode');

    const parsedMain = JSON5.parse(mainAsset!.content) as Record<string, unknown>;
    const parsedSystem = parsedMain.system as Record<string, unknown>;
    expect(parsedSystem.treePath).toBe('Resources/GameMode/CardGames/claim/claim.asset');
    expect(parsedSystem.gameId).toBe('claim');
    expect(parsedSystem.displayName).toBe('Claim');

    expect(parsedSystem.guid).toBe(bundle.mainAssetGuid);
  });

  it('applies copy-from-template fields to the main game asset', async () => {
    const { createGameModeBundle } = await import('@/adapters/assets/createGameModeBundle');

    const bundle = await createGameModeBundle({
      gameId: 'Whist',
      displayName: 'Whist',
      category: 'CardGames',
      copyFromTemplate: {
        baseBet: 25,
        minPlayers: 3,
        maxPlayers: 6,
      },
    });

    const mainAsset = bundle.files.find((file) => file.path.endsWith('/whist.asset'));
    const parsedMain = JSON5.parse(mainAsset!.content) as Record<string, unknown>;
    const parsedData = parsedMain.data as Record<string, unknown>;

    expect(parsedData.baseBet).toBe(25);
    expect(parsedData.minPlayers).toBe(3);
    expect(parsedData.maxPlayers).toBe(6);
  });

  it('creates game with all required sub-assets that validate correctly', async () => {
    const { createGameModeBundle } = await import('@/adapters/assets/createGameModeBundle');

    const bundle = await createGameModeBundle({
      gameId: 'Solitaire',
      displayName: 'Solitaire',
      category: 'CardGames',
    });

    expect(bundle.files).toHaveLength(16);

    const filesByType = new Map<string, { path: string; content: string }>();
    for (const file of bundle.files) {
      const parsed = JSON5.parse(file.content) as { system?: Record<string, unknown> };
      const assetType = parsed.system && typeof parsed.system.assetType === 'string'
        ? parsed.system.assetType
        : file.metadata?.assetType;
      expect(assetType).toBeDefined();
      const validation = validateAssetFile(parsed);
      expect(validation.success, `${file.path}: ${formatValidationResult(validation)}`).toBe(true);
      filesByType.set(assetType as string, { path: file.path, content: file.content });
    }

    for (const assetType of requiredAssetTypes) {
      const file = filesByType.get(assetType);
      expect(file, `Missing required asset type ${assetType}`).toBeDefined();
      const parsed = JSON5.parse(file!.content) as Record<string, unknown>;
      const system = parsed.system as Record<string, unknown>;
      expect(system).toBeDefined();
      expect(typeof system.guid).toBe('string');
      expect(system.guid).not.toBe('');
      expect(typeof system.treePath).toBe('string');
      expect(system.treePath).toContain('solitaire');
      expect(system.gameId).toBe('solitaire');
    }

    const mainFile = filesByType.get('CardGameMode')!;
    const mainParsed = JSON5.parse(mainFile.content) as { data?: Record<string, unknown> };
    const data = mainParsed.data as Record<string, unknown>;
    expect(data).toBeDefined();
    expect((data.deckAsset as { assetType?: string; path?: string }).assetType).toBe('Deck');
    expect((data.deckAsset as { path?: string }).path).toContain('GameMode/CardGames/Decks/');

    const refGuids = new Set<string>();
    const collectGuids = (obj: unknown): void => {
      if (obj === null || obj === undefined) return;
      if (typeof obj === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(obj)) {
        refGuids.add(obj);
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach(collectGuids);
        return;
      }
      if (typeof obj === 'object') {
        for (const value of Object.values(obj)) {
          collectGuids(value);
        }
      }
    };
    for (const file of bundle.files) {
      const parsed = JSON5.parse(file.content) as { data?: unknown };
      collectGuids(parsed.data);
    }

    const subAssetGuids = new Set(
      bundle.files
        .filter((file) => file.path !== bundle.mainAssetPath)
        .map((file) => {
          const parsed = JSON5.parse(file.content) as { system?: { guid?: string } };
          return parsed.system?.guid;
        })
        .filter((guid): guid is string => !!guid)
    );

    for (const guid of subAssetGuids) {
      expect(refGuids.has(guid), `Asset graph should reference sub-asset guid ${guid}`).toBe(true);
    }

    expect(bundle.mainAssetPath).toMatch(/\/solitaire\.asset$/);
    expect(bundle.mainAssetGuid).toBeDefined();
  });

  it('builds a full validated bundle from processed game JSON using an existing deck asset', async () => {
    const { createProcessedGameModeBundle } = await import('@/adapters/assets/createProcessedGameModeBundle');

    const bundle = await createProcessedGameModeBundle({
      processedGamePath: threeCardBragPath,
    });

    expect(bundle.mainAssetPath).toBe('Resources/GameMode/CardGames/Imported/brag-3-card/brag-3-card.asset');
    expect(bundle.files).toHaveLength(16);

    const assetTypes = bundle.files.map((file) => {
      const parsed = JSON5.parse(file.content) as { system?: { assetType?: string } };
      const validation = validateAssetFile(parsed);
      expect(validation.success, `${file.path}: ${formatValidationResult(validation)}`).toBe(true);
      return parsed.system?.assetType;
    });

    for (const assetType of requiredAssetTypes) {
      expect(assetTypes).toContain(assetType);
    }

    const mainAsset = bundle.files.find((file) => file.path.endsWith('/brag-3-card.asset'));
    expect(mainAsset).toBeDefined();

    const parsedMain = JSON5.parse(mainAsset!.content) as {
      data?: {
        deckAsset?: { assetType?: string; path?: string };
        mechanicsAsset?: { assetType?: string; checksum?: string | null };
        gameInfoAsset?: { checksum?: string | null };
      };
    };

    expect(parsedMain.data?.deckAsset?.assetType).toBe('Deck');
    expect(parsedMain.data?.deckAsset?.path).toContain('GameMode/CardGames/Decks/');
    expect(parsedMain.data?.mechanicsAsset?.assetType).toBe('CardGameMechanics');
    expect(parsedMain.data?.mechanicsAsset?.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(parsedMain.data?.gameInfoAsset?.checksum).toMatch(/^[0-9a-f]{64}$/);
  });
});
