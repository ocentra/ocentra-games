import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameModeStatus } from '@/constants/game-mode-status';
import { buildCreateGameModeOptionsFromProcessedGame } from '@/factories/ProcessedGameAssetFactory';
import { buildSelectedGamePresentation } from '@/ui/selectedGame/buildSelectedGamePresentation';
import {
  validateSelectedGameBundleReadiness,
  validateSelectedGamePresentationReadiness,
} from '@/ui/selectedGame/SelectedGameReadiness';

const sampleGamePath = path.resolve(
  process.cwd(),
  '../card-games/src/processed-games/accumulation/buta-no-shippo.json',
);

function createProcessedGameBundle(releaseStatus?: GameModeStatus, migrationReviewStatus?: string) {
  const options = buildCreateGameModeOptionsFromProcessedGame({ processedGamePath: sampleGamePath });
  const overrides = options.assetDataOverrides;
  const modelOverrides = options.mechanicsModelDataOverrides;
  const gameInfo = {
    ...overrides.gameInfo,
    editorOnly: migrationReviewStatus
      ? {
        ...overrides.gameInfo?.editorOnly,
        migrationReview: {
          ...overrides.gameInfo?.editorOnly?.migrationReview,
          status: migrationReviewStatus,
        },
      }
      : overrides.gameInfo?.editorOnly,
  };

  return {
    gameMode: {
      data: {
        displayName: options.displayName,
        deckAsset: options.linkedDeckAsset,
        releaseStatus,
        initialNumberOfCards: overrides.cardGame?.initialNumberOfCards,
        minDecks: overrides.cardGame?.minDecks,
        minPlayers: overrides.cardGame?.minPlayers,
        maxPlayers: overrides.cardGame?.maxPlayers,
      },
    },
    gameInfo: { data: gameInfo },
    rules: { data: overrides.rules },
    strategy: { data: overrides.strategy },
    scoring: { data: overrides.scoring },
    deckModel: { data: modelOverrides?.deck },
    deck: { data: { displayName: options.linkedDeckAsset?.displayName } },
    ranking: { data: overrides.scoring?.rankingAsset },
    mechanics: { data: overrides.mechanics },
    actions: { data: modelOverrides?.actions },
    validationFixtures: { data: modelOverrides?.validation },
  };
}

describe('SelectedGameReadiness', () => {
  it('accepts a processed-game import only when every selected-game tab has content', () => {
    const bundle = createProcessedGameBundle(GameModeStatus.WorkInProgress, 'pending_source_review');
    const report = validateSelectedGameBundleReadiness(bundle, { label: 'buta-no-shippo' });
    const presentation = buildSelectedGamePresentation(bundle);

    expect(report.ok).toBe(true);
    expect(report.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(presentation.tabs.map((tab) => tab.label)).toEqual([
      'About',
      'Rules',
      'Deck',
      'Ranking',
      'Scoring',
      'Strategy',
      'Systems',
    ]);
    expect(presentation.tabs.every((tab) => tab.chunks.length > 0)).toBe(true);
  });

  it('blocks public migrated games until source review is verified', () => {
    const bundle = createProcessedGameBundle(GameModeStatus.Available, 'pending_source_review');
    const report = validateSelectedGameBundleReadiness(bundle, { label: 'buta-no-shippo' });

    expect(report.ok).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'release-review-not-verified',
      severity: 'error',
    }));
  });

  it('turns graceful empty rendering into an explicit readiness failure', () => {
    const presentation = buildSelectedGamePresentation({});
    const report = validateSelectedGamePresentationReadiness(presentation, { label: 'empty' });

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      'empty-tab',
      'empty-tab',
      'empty-tab',
      'empty-tab',
      'empty-tab',
      'empty-tab',
      'empty-tab',
    ]);
  });
});
