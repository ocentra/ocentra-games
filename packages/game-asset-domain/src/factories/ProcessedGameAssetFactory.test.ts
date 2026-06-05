import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  buildCreateGameModeOptionsFromProcessedGame,
  loadProcessedGame,
  parseProcessedGameTaxonomyPath,
} from '@/factories/ProcessedGameAssetFactory';
import { validateProcessedGameTransferCoverage } from '@/factories/ProcessedGameAssetTransferContract';

const sampleGamePath = path.resolve(
  process.cwd(),
  '../card-games/src/processed-games/accumulation/buta-no-shippo.json',
);
const briscolaGamePath = path.resolve(
  process.cwd(),
  '../card-games/src/processed-games/trick-taking/briscola/briscola.json',
);

describe('buildCreateGameModeOptionsFromProcessedGame', () => {
  it('maps processed public content into separated game assets and keeps sources editor-only', () => {
    const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: sampleGamePath });
    const overrides = options.assetDataOverrides;

    expect(options.category).toBe('CardGames/Games/accumulation');
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
    expect(overrides.gameInfo.sourcesContent).toMatchObject({
      primary: [
        expect.objectContaining({
          name: 'Wikipedia - Buta no Shippo',
          url: 'https://en.wikipedia.org/wiki/Buta_no_shippo',
        }),
      ],
    });
    expect(overrides.gameInfo.editorOnly).toMatchObject({
      processedSource: expect.objectContaining({
        filename: 'buta-no-shippo.json',
        name: 'Buta no Shippo',
      }),
      migrationReview: expect.objectContaining({
        status: 'pending_source_review',
        sourceSearchRequired: true,
        requiredChecks: expect.arrayContaining([
          'verify rules against primary source pages',
          'verify aliases and duplicates so one game is not migrated twice under different names',
        ]),
      }),
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
        actionIds: expect.arrayContaining(['setup_round', 'play_card']),
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
              expectedFirstPhase: 'setup_round',
              expectedLegalActions: ['setup_round'],
              firstPlayablePhase: 'play',
              firstPlayableLegalActions: expect.arrayContaining(['play_card']),
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
    const carouselSlides = overrides.carousel.slides as Array<{ imageHash: string; label: string }>;
    expect(carouselSlides).toHaveLength(3);
    expect(new Set(carouselSlides.map((slide) => slide.imageHash)).size).toBe(3);
    expect(overrides.carousel.visualAssetSource).toBe('game_folder_fallback_art');
    expect(overrides.carousel.visualAssetStatus).toBe('needs_final_art');
    expect(overrides.carousel.visualAssetReplacementRequired).toBe(true);
    expect(overrides.cardGame.bannerImage).toBe(carouselSlides[0].imageHash);
    expect(JSON.stringify(overrides.gameInfo.sections)).not.toContain('sourceUrl');
  });

  it('reports processed JSON to generated asset transfer coverage', () => {
    const game = loadProcessedGame(sampleGamePath);
    const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: sampleGamePath });
    const report = validateProcessedGameTransferCoverage(game, options);

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('normalizes generated-only prompt and phase values without changing source truth fields', () => {
    const source = JSON.parse(fs.readFileSync(sampleGamePath, 'utf8')) as {
      prompts: { ai: string; human: string };
      rules: { gameplay: string };
      engine: { phases: Array<{ notes?: string | null }> };
    };
    source.prompts.ai = '[see source]';
    source.prompts.human = '[see source]';
    source.engine.phases[0].notes = null;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'processed-game-factory-'));
    const tempPath = path.join(tempDir, 'buta-no-shippo.json');
    fs.writeFileSync(tempPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');

    const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: tempPath });

    expect(options.assetDataOverrides.rules.LLM).not.toContain('[');
    expect(options.assetDataOverrides.rules.Player).not.toContain('[');
    expect(options.assetDataOverrides.rules.LLM).toBe(source.rules.gameplay);
    expect(options.assetDataOverrides.rules.Player).toBe(source.rules.gameplay);
    expect(options.assetDataOverrides.mechanics.phases.find((phase: { id?: string }) => phase.id === 'play')).not.toHaveProperty('notes');
    expect(options.mechanicsModelDataOverrides?.phaseFlow.phases.find((phase: { id?: string }) => phase.id === 'play')).not.toHaveProperty('notes');
  });

  it('uses rotated shared fallback art when no per-game image folder exists', () => {
    const source = JSON.parse(fs.readFileSync(sampleGamePath, 'utf8'));
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'processed-game-factory-'));
    const tempPath = path.join(tempDir, 'no-image-carousel-source.json');
    fs.writeFileSync(tempPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');

    const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: tempPath });
    const carousel = options.assetDataOverrides.carousel;
    const slides = carousel.slides as Array<{ imageHash: string; label: string }>;

    expect(carousel.visualAssetSource).toBe('shared_fallback_art');
    expect(carousel.visualAssetStatus).toBe('needs_final_art');
    expect(carousel.visualAssetReplacementRequired).toBe(true);
    expect(slides).toHaveLength(3);
    expect(new Set(slides.map((slide) => slide.imageHash)).size).toBe(3);
    expect(slides.every((slide) => slide.label.includes('fallback art'))).toBe(true);
    expect(options.assetDataOverrides.cardGame.bannerImage).toBe(slides[0].imageHash);
  });

  it('extracts numeric scoring values from source card-value text', () => {
    const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: briscolaGamePath });

    expect(options.assetDataOverrides.scoring.cardValues).toMatchObject({
      Ace: 11,
      Three: 10,
      King: 4,
      Queen: 3,
      Jack: 2,
    });
    expect(options.assetDataOverrides.scoring.scoringRules.sourceCardValues).toBeUndefined();
    expect(options.assetDataOverrides.scoring.scoringRules.nullReasons).toEqual({});
  });

  it('preserves source null reasons when source card values are empty', () => {
    const source = JSON.parse(fs.readFileSync(briscolaGamePath, 'utf8'));
    source.scoring.cardValues = {};
    source.scoring.nullReasons = {
      cardValues: 'The source scores tricks rather than assigning fixed values to every card rank.',
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'processed-game-factory-'));
    const tempPath = path.join(tempDir, 'empty-card-values-with-reason-source.json');
    fs.writeFileSync(tempPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');

    const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: tempPath });

    expect(options.assetDataOverrides.scoring.cardValues).toEqual({});
    expect(options.assetDataOverrides.scoring.scoringRules.nullReasons).toMatchObject({
      cardValues: 'The source scores tricks rather than assigning fixed values to every card rank.',
    });
  });

  it('rejects processed-game migrations outside categorized CardGames/Games folders', () => {
    expect(() => parseProcessedGameTaxonomyPath('CardGames/Games')).toThrow();
    expect(() => parseProcessedGameTaxonomyPath('CardGames/Imported')).toThrow();
    expect(parseProcessedGameTaxonomyPath('CardGames/Games/Trick-Taking')).toBe('CardGames/Games/trick-taking');
  });
});
