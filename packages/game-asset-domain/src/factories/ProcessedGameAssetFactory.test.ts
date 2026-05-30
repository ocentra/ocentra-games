import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCreateGameModeOptionsFromProcessedGame,
  loadProcessedGame,
} from '@/factories/ProcessedGameAssetFactory';
import { validateProcessedGameTransferCoverage } from '@/factories/ProcessedGameAssetTransferContract';

const sampleGamePath = path.resolve(
  process.cwd(),
  '../card-games/src/processed-games/accumulation/buta-no-shippo.json',
);

describe('buildCreateGameModeOptionsFromProcessedGame', () => {
  it('maps processed public content into separated game assets and keeps sources editor-only', () => {
    const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: sampleGamePath });
    const overrides = options.assetDataOverrides;

    expect(overrides.gameInfo.origin).toBe('Japan');
    expect(overrides.gameInfo.originName).toBe('Buta no Shippo');
    expect(overrides.gameInfo.historyContent).toMatchObject({
      origins: expect.stringContaining('Japanese family card game'),
      originCountries: ['Japan'],
    });
    expect(overrides.gameInfo.setupContent).toMatchObject({
      deck: 'Standard playing-card pack',
      dealing: expect.stringContaining('Spread cards face down'),
    });
    expect(overrides.rules.setup).toMatchObject({
      deck: 'Standard playing-card pack',
    });
    expect(overrides.strategy.Player).toContain('Watch suits and ranks');
    expect(overrides.scoring.winCondition).toContain('fewer penalty cards');
    expect(overrides.gameInfo.sections.map((section) => section.type)).toEqual(['about']);
    expect(overrides.gameInfo.editorOnly).toMatchObject({
      sources: expect.objectContaining({
        primary: expect.any(Array),
      }),
      evidence: expect.any(Array),
    });
    expect(overrides.gameInfo.mechanicsContract).toMatchObject({
      gameId: 'buta-no-shippo',
      linkedAssetKeys: {
        deckModel: 'buta-no-shippoDeckModel.asset',
        actionSet: 'buta-no-shippoActionSet.asset',
        validationFixtures: 'buta-no-shippoValidationFixtures.asset',
      },
    });
    expect(options.mechanicsModelDataOverrides?.deck).toMatchObject({
      deckType: 'Standard 52',
      suitSet: 'French',
      rankSet: 'Standard_52',
      assetRefs: {
        deck: expect.objectContaining({ assetType: 'Deck' }),
        ranking: expect.objectContaining({ assetType: 'DeckRanking' }),
      },
    });
    expect(options.mechanicsModelDataOverrides?.actions).toMatchObject({
      actionModel: {
        actionIds: expect.arrayContaining(['play_card']),
      },
    });
    expect(options.mechanicsModelDataOverrides?.validation).toMatchObject({
      validationSuites: [
        {
          id: 'buta-no-shippo.core-runtime-contracts',
          fixtures: expect.arrayContaining([
            expect.objectContaining({
              purpose: 'setup',
              expectedInitialHandSize: 3,
              expectedPlayerCounts: expect.objectContaining({
                min: 2,
                max: 8,
              }),
              expectedDeckCount: 1,
            }),
            expect.objectContaining({
              purpose: 'flow',
              expectedFirstPhase: 'play',
              expectedLegalActions: expect.arrayContaining(['play_card']),
            }),
            expect.objectContaining({
              purpose: 'scoring',
              expectedFinalScore: expect.stringContaining('fewer penalty cards'),
            }),
          ]),
        },
      ],
      examples: [
        expect.objectContaining({
          expectedInitialHandSize: 3,
        }),
      ],
    });
    expect(JSON.stringify(overrides.gameInfo.sections)).not.toContain('sourceUrl');
  });

  it('reports processed JSON to generated asset transfer coverage', () => {
    const game = loadProcessedGame(sampleGamePath);
    const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: sampleGamePath });
    const report = validateProcessedGameTransferCoverage(game, options);

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });
});
