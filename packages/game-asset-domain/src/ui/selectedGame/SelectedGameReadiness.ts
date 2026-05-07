import { schema } from '@ocentra/schema-domain/effect-builder';
import {
  DEFAULT_SELECTED_GAME_TAB_ORDER,
  type SelectedGamePresentation,
  type SelectedGamePresentationChunk,
  type SelectedGameTabId,
} from '@/ui/selectedGame/SelectedGamePresentation';
import {
  buildSelectedGamePresentation,
  type BuildSelectedGamePresentationInput,
} from '@/ui/selectedGame/buildSelectedGamePresentation';

export const SelectedGameReadinessSeveritySchema = schema.enum(['error', 'warning']);

export const SelectedGameReadinessIssueSchema = schema.object({
  severity: SelectedGameReadinessSeveritySchema,
  code: schema.string(),
  path: schema.string(),
  message: schema.string(),
});

export const SelectedGameReadinessReportSchema = schema.object({
  ok: schema.boolean(),
  label: schema.string(),
  issues: schema.array(SelectedGameReadinessIssueSchema),
});

export type SelectedGameReadinessIssue = schema.infer<typeof SelectedGameReadinessIssueSchema>;
export type SelectedGameReadinessReport = schema.infer<typeof SelectedGameReadinessReportSchema>;

export interface SelectedGameReadinessOptions {
  label?: string;
  requireTabs?: readonly SelectedGameTabId[];
  requireRichGameInfo?: boolean;
}

const PROVENANCE_PATTERN = /\b(provenance|scraper|audit)\b|https?:\/\//i;

export function validateSelectedGamePresentationReadiness(
  presentation: SelectedGamePresentation,
  options: SelectedGameReadinessOptions = {},
): SelectedGameReadinessReport {
  const label = options.label ?? presentation.hero.title ?? 'selected-game';
  const requiredTabs = options.requireTabs ?? DEFAULT_SELECTED_GAME_TAB_ORDER;
  const issues: SelectedGameReadinessIssue[] = [];

  for (const tabId of requiredTabs) {
    const tab = presentation.tabs.find((item) => item.id === tabId);
    if (!tab) {
      issues.push(issue('error', 'missing-tab', `tabs.${tabId}`, `Missing selected-game tab: ${tabId}.`));
      continue;
    }

    if (tab.chunks.length === 0) {
      issues.push(issue('error', 'empty-tab', `tabs.${tabId}.chunks`, `Selected-game tab has no public chunks: ${tab.label}.`));
      continue;
    }

    tab.chunks.forEach((chunkItem, index) => {
      if (!chunkHasPublicContent(chunkItem)) {
        issues.push(issue('warning', 'empty-chunk', `tabs.${tabId}.chunks.${index}`, `Chunk has no body, bullets, or visual refs: ${chunkItem.title}.`));
      }
    });
  }

  const publicText = presentation.tabs
    .flatMap((tab) => tab.chunks)
    .flatMap((chunkItem) => [
      chunkItem.title,
      chunkItem.eyebrow ?? '',
      ...chunkItem.body,
      ...chunkItem.bullets,
      ...(chunkItem.visualRefs ?? []).map((ref) => ref.label),
    ])
    .join(' ');

  if (PROVENANCE_PATTERN.test(publicText)) {
    issues.push(issue('error', 'provenance-leak', 'tabs', 'Public selected-game chunks include scraper, audit, provenance, or URL text.'));
  }

  return SelectedGameReadinessReportSchema.parse({
    ok: !issues.some((item) => item.severity === 'error'),
    label,
    issues,
  });
}

export function validateSelectedGameBundleReadiness(
  bundle: BuildSelectedGamePresentationInput,
  options: SelectedGameReadinessOptions = {},
): SelectedGameReadinessReport {
  const presentation = buildSelectedGamePresentation(bundle);
  const report = validateSelectedGamePresentationReadiness(presentation, options);
  const issues = [...report.issues];
  const gameInfo = dataOf(bundle.gameInfo);
  const gameMode = dataOf(bundle.gameMode);
  const scoring = dataOf(bundle.scoring);
  const mechanics = dataOf(bundle.mechanics);

  if (options.requireRichGameInfo !== false) {
    for (const field of ['historyContent', 'setupContent', 'variationsContent', 'aiContent'] as const) {
      if (!isMeaningful(gameInfo[field])) {
        issues.push(issue('warning', 'missing-rich-game-info', `gameInfo.${field}`, `GameInfo is missing ${field}; selected-game About will be thinner than the processed source allows.`));
      }
    }
  }

  if (!isMeaningful(gameMode.deckAsset) && !isMeaningful(dataOf(bundle.deck))) {
    issues.push(issue('error', 'missing-deck', 'gameMode.deckAsset', 'Selected-game Deck tab needs a deck asset reference or loaded deck asset.'));
  }

  if (!isMeaningful(gameMode.rankingAsset) && !isMeaningful(scoring.rankingAsset) && !isMeaningful(dataOf(bundle.ranking))) {
    issues.push(issue('warning', 'missing-ranking', 'scoring.rankingAsset', 'Selected-game Ranking tab has no ranking asset reference; it will fall back to text only.'));
  }

  const linkedKeys = {
    ...asRecord(asRecord(gameInfo.mechanicsContract).linkedAssetKeys),
    ...asRecord(mechanics.modelRefs),
  };
  for (const key of ['deckModel', 'deck', 'actionSet', 'actions', 'validationFixtures', 'validation']) {
    if (isMeaningful(linkedKeys[key])) {
      return SelectedGameReadinessReportSchema.parse({
        ok: !issues.some((item) => item.severity === 'error'),
        label: report.label,
        issues,
      });
    }
  }

  issues.push(issue('warning', 'missing-mechanics-model-links', 'mechanics.modelRefs', 'Selected-game Systems/Deck/Scoring tabs have no linked deck, action, or validation model assets.'));

  return SelectedGameReadinessReportSchema.parse({
    ok: !issues.some((item) => item.severity === 'error'),
    label: report.label,
    issues,
  });
}

export function assertSelectedGameReadiness(report: SelectedGameReadinessReport, failOnWarnings = false): void {
  const blocking = report.issues.filter((item) => item.severity === 'error' || failOnWarnings);
  if (blocking.length === 0) {
    return;
  }
  const details = blocking.map((item) => `${item.severity.toUpperCase()} ${item.path}: ${item.message}`).join('\n');
  throw new Error(`Selected-game readiness failed for ${report.label}\n${details}`);
}

function chunkHasPublicContent(chunkItem: SelectedGamePresentationChunk): boolean {
  return chunkItem.body.length > 0 || chunkItem.bullets.length > 0 || Boolean(chunkItem.visualRefs?.length);
}

function issue(
  severity: SelectedGameReadinessIssue['severity'],
  code: string,
  path: string,
  message: string,
): SelectedGameReadinessIssue {
  return { severity, code, path, message };
}

function dataOf(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(isMeaningful);
  }
  if (typeof value === 'object') {
    return Object.values(value).some(isMeaningful);
  }
  return false;
}
