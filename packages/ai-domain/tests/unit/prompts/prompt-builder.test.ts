import { describe, it, expect } from 'vitest';
import {
  formatBonusRules,
  formatBluffSettings,
  buildSystemPrompt,
  buildUserPrompt,
} from '@/prompts/prompt-builder';
import type { BonusRule, BluffSetting, PromptConfig, GameRulesData, GameStateData } from '@/prompts/prompt-types';

describe('prompt-builder', () => {
  it('formatBonusRules: returns empty string for empty rules', () => {
    expect(formatBonusRules([])).toBe('');
    expect(formatBonusRules(undefined)).toBe('');
  });

  it('formatBonusRules: formats rules with name and points', () => {
    const rules: BonusRule[] = [{ name: 'Royal', points: 100, description: 'Royal flush' }];
    expect(formatBonusRules(rules)).toContain('Royal');
    expect(formatBonusRules(rules)).toContain('100');
  });

  it('formatBluffSettings: returns empty for empty', () => {
    expect(formatBluffSettings([])).toBe('');
  });

  it('formatBluffSettings: formats key-value pairs', () => {
    const settings: BluffSetting[] = [{ key: 'enabled', value: 'true' }];
    expect(formatBluffSettings(settings)).toContain('enabled');
    expect(formatBluffSettings(settings)).toContain('true');
  });

  it('buildSystemPrompt: includes game description and rules', () => {
    const config: PromptConfig = {
      gameDescription: 'Test Game',
      bonusRules: [],
      bluffSettings: [],
      moveValidityConditions: [],
      exampleHands: [],
    };
    const rules: GameRulesData = { rulesLLM: 'Play fair.' };
    const result = buildSystemPrompt(config, rules);
    expect(result).toContain('Test Game');
    expect(result).toContain('Play fair.');
  });

  it('buildUserPrompt: includes game state fields', () => {
    const state: GameStateData = {
      playerHand: 'A K',
      scores: '10-5',
      remainingCards: '20',
      floorCards: 'Q J',
      allPlayersData: 'Alice Bob',
    };
    const result = buildUserPrompt(state);
    expect(result).toContain('A K');
    expect(result).toContain('10-5');
    expect(result).toContain('Alice Bob');
  });
});
