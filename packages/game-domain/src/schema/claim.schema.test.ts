import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import JSON5 from 'json5';
import { describe, expect, it } from 'vitest';
import {
  evaluateMechanicsExample,
  listMechanicsExamples,
} from '@/engine/mechanics/MechanicsExampleService';
import {
  compileClaimRuntimeConfig,
  extractClaimStrategyProfile,
  validateClaimAssetBundle,
  withClaimStrategyProfile,
} from './claim.schema';
import { compileMechanicsWithModels } from './mechanics-model.schema';
import { decodeMechanicsSpec } from './mechanics.schema';

const CLAIM_ASSET_DIR = new URL('../../../asset-editor/Resources/GameMode/CardGames/Games/Claim/', import.meta.url);

function loadAsset(fileName: string): unknown {
  return JSON5.parse(readFileSync(fileURLToPath(new URL(fileName, CLAIM_ASSET_DIR)), 'utf8')) as unknown;
}

function loadClaimModelAssets(): unknown[] {
  return [
    'claimPlayerModel.asset',
    'claimSessionModel.asset',
    'claimDeckModel.asset',
    'claimZoneModel.asset',
    'claimPhaseFlowModel.asset',
    'claimActionSet.asset',
    'claimStateEventModel.asset',
    'claimValidationFixtures.asset',
  ].map(loadAsset);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

describe('Claim asset Effect Schema validation', () => {
  it('validates the linked Claim mechanics, rules, scoring, and strategy assets together', () => {
    const issues = validateClaimAssetBundle({
      mechanics: loadAsset('claimMechanics.asset'),
      rules: loadAsset('claimRules.asset'),
      scoring: loadAsset('claimScoring.asset'),
      strategy: loadAsset('claimStrategy.asset'),
    });

    expect(issues).toEqual([]);
  });

  it('compiles Claim runtime config with strategy knobs from the strategy asset', () => {
    const mechanicsRoot = loadAsset('claimMechanics.asset');
    const strategy = extractClaimStrategyProfile(loadAsset('claimStrategy.asset'));
    const root = mechanicsRoot && typeof mechanicsRoot === 'object' && !Array.isArray(mechanicsRoot)
      ? mechanicsRoot as Record<string, unknown>
      : {};
    const spec = withClaimStrategyProfile(decodeMechanicsSpec(root.data), strategy);
    const config = compileClaimRuntimeConfig(spec);

    expect(config.startingBankroll).toBe(1352);
    expect(config.minHandSize).toBe(3);
    expect(config.maxRounds).toBe(10);
    expect(config.showdownMinimum).toBe(27);
    expect(config.timerSeconds).toBe(60);
    expect(config.strategy).toEqual({
      aggressiveness: 0.6,
      riskTolerance: 0.5,
      bluffFrequency: 0.25,
    });
  });

  it('compiles Claim through extracted core mechanics model assets', () => {
    const mechanicsRoot = loadAsset('claimMechanics.asset');
    const root = mechanicsRoot && typeof mechanicsRoot === 'object' && !Array.isArray(mechanicsRoot)
      ? mechanicsRoot as Record<string, unknown>
      : {};
    const baseSpec = decodeMechanicsSpec(root.data);
    const compiled = compileMechanicsWithModels(baseSpec, loadClaimModelAssets());

    expect(compiled.issues).toEqual([]);
    expect(compiled.spec.modelRefs && Object.keys(compiled.spec.modelRefs)).toHaveLength(8);
    expect(compiled.spec.playerConfig).toMatchObject({ minPlayers: 4, maxPlayers: 4, optimalPlayers: 4 });
    expect(compiled.spec.phases.map((phase) => phase.id)).toEqual(['setup_round', 'turn_loop', 'score_round']);
    expect(compiled.spec.actionModel?.actionIds).toEqual([
      'take_stock',
      'take_discard',
      'discard_card',
      'declare_suit',
      'end_turn',
      'timeout_turn',
      'call_showdown',
    ]);
    expect(compiled.spec.validationSuites).toHaveLength(1);
  });

  it('exposes every Claim scoring example ref through the mechanics example service', () => {
    const mechanicsRoot = asRecord(loadAsset('claimMechanics.asset'));
    const scoringRoot = asRecord(loadAsset('claimScoring.asset'));
    const scoringData = asRecord(scoringRoot.data);
    const baseSpec = decodeMechanicsSpec(mechanicsRoot.data);
    const compiled = compileMechanicsWithModels(baseSpec, loadClaimModelAssets());
    const exampleRefs = readStringArray(scoringData.exampleRefs);
    const summaries = listMechanicsExamples(compiled.spec, { purpose: 'scoring' });

    expect(compiled.issues).toEqual([]);
    expect(exampleRefs).toHaveLength(7);
    expect(summaries.map((summary) => summary.id).sort()).toEqual([...exampleRefs].sort());

    for (const exampleId of exampleRefs) {
      const evaluated = evaluateMechanicsExample(compiled.spec, { exampleId });
      expect(evaluated?.passed, exampleId).toBe(true);
    }
  });

  it('rejects invalid Claim strategy ratios at the boundary', () => {
    expect(() =>
      extractClaimStrategyProfile({
        data: {
          aggressiveness: 2,
          riskTolerance: 0.5,
          bluffFrequency: 0.25,
        },
      })
    ).toThrow();
  });
});
