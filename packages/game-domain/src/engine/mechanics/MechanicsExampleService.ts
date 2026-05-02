import type { ClaimScoringFixture } from '@/engine/mechanics/family/ClaimScoring';
import {
  calculateClaimPlayerScore,
  parseClaimFixtureCard,
  parseClaimFixtureSuit,
} from '@/engine/mechanics/family/ClaimScoring';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import type { Card, Player } from '@/types/game';
import * as Schema from 'effect/Schema';
import { ClaimScoringFixtureSchema } from '@/schema/claim.schema';

export type MechanicsExamplePurpose =
  | 'action'
  | 'explanation'
  | 'scoring'
  | 'setup'
  | 'settlement'
  | 'strategy'
  | 'ui'
  | 'validation';

export interface MechanicsExampleQuery {
  readonly exampleId?: string;
  readonly purpose?: MechanicsExamplePurpose | string;
  readonly suiteId?: string;
}

export interface MechanicsExampleSummary {
  readonly id: string;
  readonly familyKernel: string;
  readonly mechanicsId?: string;
  readonly purpose: MechanicsExamplePurpose | string;
  readonly sourceAsset?: string;
  readonly suiteId: string;
  readonly title: string;
  readonly linkedRuleIds: readonly string[];
}

export interface MechanicsExampleEvaluation {
  readonly actual: number | null;
  readonly cards: readonly Card[];
  readonly declaredSuit: string | null;
  readonly expected: number | null;
  readonly explanation: string;
  readonly passed: boolean | null;
  readonly scoreBreakdown: {
    readonly debt: number;
    readonly finalScore: number;
    readonly negative: number;
    readonly positive: number;
  } | null;
  readonly summary: MechanicsExampleSummary;
  readonly type: 'claim_scoring';
}

interface ClaimScoringExampleRecord {
  readonly fixture: ClaimScoringFixture;
  readonly summary: MechanicsExampleSummary;
}

export function listMechanicsExamples(
  spec: MechanicsSpec,
  query: MechanicsExampleQuery = {},
): MechanicsExampleSummary[] {
  return resolveExampleSummaries(spec).filter((summary) => matchesQuery(summary, query));
}

export function evaluateMechanicsExample(
  spec: MechanicsSpec,
  query: MechanicsExampleQuery,
): MechanicsExampleEvaluation | null {
  if (spec.familyKernel !== 'claim') {
    return null;
  }

  const record = extractClaimScoringExamples(spec).find((entry) => matchesQuery(entry.summary, query));
  return record ? evaluateClaimScoringExample(record) : null;
}

function resolveExampleSummaries(spec: MechanicsSpec): MechanicsExampleSummary[] {
  if (spec.familyKernel === 'claim') {
    return extractClaimScoringExamples(spec).map((entry) => entry.summary);
  }

  return [];
}

function extractClaimScoringExamples(spec: MechanicsSpec): ClaimScoringExampleRecord[] {
  return (spec.validationSuites ?? []).flatMap((suite, suiteIndex) => {
    const suiteRecord = asRecord(suite);
    const suiteId = readString(suiteRecord, 'id') ?? `validation-suite-${suiteIndex}`;
    const fixtures = suiteRecord?.fixtures;

    if (!Array.isArray(fixtures)) {
      return [];
    }

    return fixtures.flatMap((fixture, fixtureIndex) => {
      const decoded = decodeClaimScoringFixture(fixture);
      if (!decoded) {
        return [];
      }

      const id = decoded.id ?? `${suiteId}.${fixtureIndex}`;
      return [{
        fixture: decoded,
        summary: {
          familyKernel: spec.familyKernel,
          id,
          linkedRuleIds: decoded.linkedRuleIds ?? [],
          mechanicsId: spec.mechanicsId,
          purpose: decoded.purpose ?? 'scoring',
          sourceAsset: decoded.sourceAsset,
          suiteId,
          title: decoded.title ?? createClaimScoringTitle(decoded),
        },
      }];
    });
  });
}

function decodeClaimScoringFixture(input: unknown): ClaimScoringFixture | null {
  try {
    const decoded = Schema.decodeUnknownSync(ClaimScoringFixtureSchema)(input);
    return {
      declaredSuit: decoded.declaredSuit,
      debt: decoded.debt,
      expectedFinalScore: decoded.expectedFinalScore,
      explanation: decoded.explanation,
      hand: decoded.hand,
      id: decoded.id,
      linkedRuleIds: decoded.linkedRuleIds,
      purpose: decoded.purpose,
      sourceAsset: decoded.sourceAsset,
      title: decoded.title,
    };
  } catch {
    return null;
  }
}

function evaluateClaimScoringExample(record: ClaimScoringExampleRecord): MechanicsExampleEvaluation {
  const cards = record.fixture.hand.map(parseClaimFixtureCard).filter((card): card is Card => Boolean(card));
  const declaredSuit = parseClaimFixtureSuit(record.fixture.declaredSuit);
  const player: Player = {
    aiPersonality: undefined,
    avatar: '',
    declaredSuit,
    hand: [...cards],
    id: 'example-player',
    intentCard: null,
    isAI: false,
    isConnected: true,
    name: 'Example Player',
    score: 0,
  };
  const score = calculateClaimPlayerScore(player, declaredSuit, record.fixture.debt ?? 0);
  const passed = score.finalScore === record.fixture.expectedFinalScore;

  return {
    actual: score.finalScore,
    cards,
    declaredSuit,
    expected: record.fixture.expectedFinalScore,
    explanation: record.fixture.explanation ?? createClaimScoringExplanation(record.fixture, score.finalScore),
    passed,
    scoreBreakdown: {
      debt: score.debt,
      finalScore: score.finalScore,
      negative: score.negative,
      positive: score.positive,
    },
    summary: record.summary,
    type: 'claim_scoring',
  };
}

function createClaimScoringTitle(fixture: ClaimScoringFixture): string {
  const declared = fixture.declaredSuit ? `declared ${fixture.declaredSuit}` : 'undeclared';
  return `${fixture.hand.join(', ')} (${declared})`;
}

function createClaimScoringExplanation(fixture: ClaimScoringFixture, actual: number): string {
  const declared = fixture.declaredSuit ? `declared ${fixture.declaredSuit}` : 'undeclared';
  return `${fixture.hand.join(', ')} with ${declared} scores ${actual}.`;
}

function matchesQuery(summary: MechanicsExampleSummary, query: MechanicsExampleQuery): boolean {
  return (!query.exampleId || summary.id === query.exampleId)
    && (!query.purpose || summary.purpose === query.purpose)
    && (!query.suiteId || summary.suiteId === query.suiteId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readString(record: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
