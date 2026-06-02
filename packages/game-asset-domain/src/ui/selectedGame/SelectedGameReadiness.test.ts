import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameModeStatus } from '@/constants/game-mode-status';
import { buildCreateGameModeOptionsFromProcessedGame } from '@/factories/ProcessedGameAssetFactory';
import { DEFAULT_SELECTED_GAME_CONTENT_PLAN } from '@/ui/selectedGame/SelectedGamePresentation';
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
    layout: {
      data: {
        contentPlan: DEFAULT_SELECTED_GAME_CONTENT_PLAN,
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
    expect(bundle.rules.data.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'buta-no-shippo.rules.objective' }),
      expect.objectContaining({ id: 'buta-no-shippo.rules.gameplay' }),
      expect.objectContaining({ id: 'buta-no-shippo.setup.dealing' }),
      expect.objectContaining({ id: 'buta-no-shippo.score.description' }),
    ]));
    expect(bundle.rules.data.ruleGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Objective' }),
      expect.objectContaining({ label: 'Setup' }),
      expect.objectContaining({ label: 'Key Rules' }),
      expect.objectContaining({ label: 'Scoring' }),
    ]));
    expect(bundle.scoring.data.scoringRules).toEqual(expect.objectContaining({
      summary: bundle.scoring.data.description,
      winCondition: bundle.scoring.data.winCondition,
    }));
  });

  it('buildSelectedGamePresentation: uses layout-authored tab tips and does not fake empty hero or stats', () => {
    const presentation = buildSelectedGamePresentation({
      layout: {
        data: {
          contentPlan: {
            tabs: DEFAULT_SELECTED_GAME_CONTENT_PLAN.tabs.map((tab) => (
              tab.id === 'about'
                ? { ...tab, tip: 'Asset-authored about tip.' }
                : tab
            )),
          },
        },
      },
      gameMode: { data: { minPlayers: 2, maxPlayers: 4, turnDuration: 0 } },
      rules: { data: { showdownRules: { minimumFinalScore: 0 }, turnRules: { timerSeconds: 0 } } },
      scoring: { data: { targetScore: 0, showdownMinimumFinalScore: 0 } },
    });

    expect(presentation.hero.title).toBe('');
    expect(presentation.tip.about).toBe('Asset-authored about tip.');
    expect(presentation.tabs.find((tab) => tab.id === 'about')?.tip).toBe('Asset-authored about tip.');
    expect(presentation.sideA.stats.map((metric) => metric.value)).not.toEqual(expect.arrayContaining(['Cards', '0+', '0s']));
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

  it('requires verified source review evidence before migrated games can become public', () => {
    const bundle = createProcessedGameBundle(GameModeStatus.Available, 'verified');
    const report = validateSelectedGameBundleReadiness(bundle, { label: 'buta-no-shippo' });

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'release-review-missing-reviewed-at',
      'release-review-missing-reviewer',
      'release-review-missing-verified-check',
    ]));
  });

  it('blocks missing core rules instead of relying on graceful empty rendering', () => {
    const bundle = createProcessedGameBundle(GameModeStatus.WorkInProgress, 'pending_source_review');
    const report = validateSelectedGameBundleReadiness({
      ...bundle,
      rules: {
        data: {
          ...bundle.rules.data,
          objective: '',
          keyRules: [],
          exampleHands: [],
        },
      },
    }, { label: 'buta-no-shippo' });

    expect(report.ok).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing-core-rule-field', path: 'rules.objective' }),
      expect.objectContaining({ code: 'missing-core-rule-field', path: 'rules.keyRules' }),
      expect.objectContaining({ code: 'missing-core-rule-field', path: 'rules.exampleHands' }),
    ]));
  });

  it('turns graceful empty rendering into an explicit readiness failure', () => {
    const presentation = buildSelectedGamePresentation({});
    const report = validateSelectedGamePresentationReadiness(presentation, { label: 'empty' });

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      'missing-hero-title',
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
