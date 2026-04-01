import { describe, it, expect } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { TURN_DIRECTION_VALUES, TURN_STARTS_WITH_VALUES } from '@ocentra/game-domain/game/turnOrder';

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
          },
          {
            id: 'play',
            label: 'Play',
            actor: 'current_player',
            legalActions: ['play_card'],
            nextPhase: null,
          },
        ],
        actions: {
          play_card: {
            supported: true,
            description: 'Play a card to the table',
            effectType: 'play',
          },
        },
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
          },
        ],
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('data.phases.0.nextPhase');
    }
  });
});
