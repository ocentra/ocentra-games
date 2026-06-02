import { describe, it, expect } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { TURN_DIRECTION_VALUES, TURN_STARTS_WITH_VALUES } from '@ocentra/game-domain/game/turnOrder';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';

const CLAIM_ASSET_DIR = new URL('../../../../asset-editor/Resources/GameMode/CardGames/Games/invented/claim/', import.meta.url);

function loadClaimAsset(fileName: string): unknown {
  return JSON5.parse(readFileSync(fileURLToPath(new URL(fileName, CLAIM_ASSET_DIR)), 'utf8')) as unknown;
}

describe('CardGameMechanics asset validation', () => {
  const system = {
    guid: '00000000-0000-4000-8000-000000000000',
    assetType: 'CardGameMechanics',
    schemaVersion: 1,
    displayName: 'Claim Mechanics',
    category: 'Game',
    treePath: 'Resources/GameMode/CardGames/claim/claimMechanics.asset',
  };

  it('accepts a minimal mechanics asset', () => {
    const result = validateAssetFile({
      system,
      data: {
        familyKernel: 'custom_claim',
        kernelVersion: '1.0',
        playerConfig: {
          playerMode: 'multiplayer',
          minPlayers: 2,
          maxPlayers: 4,
          dealerRotates: true,
        },
        turnPolicy: {
          direction: TURN_DIRECTION_VALUES[0],
          startsWith: TURN_STARTS_WITH_VALUES[0],
        },
        phases: [
          {
            id: 'setup',
            label: 'Deal',
            actor: 'dealer',
            legalActions: ['deal'],
            nextPhase: 'play',
            isMandatory: true,
            conditionalNext: [],
            cardVisibilityChanges: {},
          },
          {
            id: 'play',
            label: 'Play',
            actor: 'current_player',
            legalActions: ['play_card'],
            nextPhase: null,
            isMandatory: true,
            conditionalNext: [],
            cardVisibilityChanges: {},
          },
        ],
        actions: {
          deal: {
            supported: true,
            description: 'Deal cards',
            effectType: 'deal',
            effectHints: {},
            isTerminating: false,
          },
          play_card: {
            supported: true,
            description: 'Play a card to the table',
            effectType: 'play',
            effectHints: {},
            isTerminating: false,
          },
        },
        customActions: [],
        zones: [],
        endConditions: [],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a phase that references a missing nextPhase', () => {
    const result = validateAssetFile({
      system,
      data: {
        familyKernel: 'custom_claim',
        kernelVersion: '1.0',
        playerConfig: {
          playerMode: 'multiplayer',
          minPlayers: 2,
          maxPlayers: 4,
          dealerRotates: true,
        },
        turnPolicy: {
          direction: TURN_DIRECTION_VALUES[0],
          startsWith: TURN_STARTS_WITH_VALUES[0],
        },
        phases: [
          {
            id: 'play',
            label: 'Play',
            actor: 'current_player',
            legalActions: ['play_card'],
            nextPhase: 'missing',
            isMandatory: true,
            conditionalNext: [],
            cardVisibilityChanges: {},
          },
        ],
        actions: {
          play_card: {
            supported: true,
            description: 'Play a card to the table',
            effectType: 'play',
            effectHints: {},
            isTerminating: false,
          },
        },
        customActions: [],
        zones: [],
        endConditions: [],
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('data.phases.0.nextPhase');
      expect(result.error.issues[0]?.message).toContain('phases.0.nextPhase');
    }
  });

  it('accepts extracted mechanics model assets through the asset validator', () => {
    const modelFiles = [
      'claimPlayerModel.asset',
      'claimSessionModel.asset',
      'claimDeckModel.asset',
      'claimZoneModel.asset',
      'claimPhaseFlowModel.asset',
      'claimActionSet.asset',
      'claimStateEventModel.asset',
      'claimValidationFixtures.asset',
    ];

    const loadedAssets = modelFiles.map((fileName) => loadClaimAsset(fileName));
    const results = loadedAssets.map((asset) => validateAssetFile(asset));

    expect(results.every((result) => result.success)).toBe(true);
    expect(loadedAssets.every((asset) => {
      const data = asset && typeof asset === 'object' && !Array.isArray(asset)
        ? (asset as { data?: Record<string, unknown> }).data
        : undefined;
      return !data || !Object.prototype.hasOwnProperty.call(data, 'model');
    })).toBe(true);
  });

  it('accepts legacy mechanics model wrapper assets at the decode boundary', () => {
    const result = validateAssetFile({
      system: {
        ...system,
        assetType: 'GamePlayerModel',
        displayName: 'Legacy Player Model',
      },
      data: {
        modelKind: 'player_model',
        modelId: 'claim.legacy-player-model.v1',
        modelVersion: '1.0.0',
        model: {
          playerConfig: {
            playerMode: 'multiplayer',
            minPlayers: 4,
            maxPlayers: 4,
            optimalPlayers: 4,
            dealerRotates: true,
          },
          playerModel: {},
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects mechanics model assets whose payload does not match the model kind', () => {
    const result = validateAssetFile({
      system: {
        ...system,
        assetType: 'GameActionSet',
        displayName: 'Invalid Claim Model',
      },
      data: {
        modelKind: 'action_set_model',
        modelId: 'claim.invalid-action-set.v1',
        modelVersion: '1.0.0',
        model: {
          playerConfig: {
            playerMode: 'multiplayer',
            minPlayers: 4,
            maxPlayers: 4,
            optimalPlayers: 4,
            dealerRotates: true,
          },
          playerModel: {},
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path.join('.')).toContain('data');
      expect(result.error.issues[0]?.message).toContain('actionModel');
    }
  });
});
