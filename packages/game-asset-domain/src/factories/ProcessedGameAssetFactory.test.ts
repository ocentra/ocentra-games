import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCreateGameModeOptionsFromProcessedGame } from '@/factories/ProcessedGameAssetFactory';

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
    expect(JSON.stringify(overrides.gameInfo.sections)).not.toContain('sourceUrl');
  });
});
