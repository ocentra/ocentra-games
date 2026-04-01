import type {
  GameRulesData,
  GameStateData,
  BonusRule,
  BluffSetting,
  MoveValidityCondition,
  ExampleHand,
  PromptConfig,
} from '@/prompts/prompt-types';

export function formatBonusRules(rules: BonusRule[] | undefined): string {
  if (!rules || rules.length === 0) return '';
  return rules
    .map((r, i) => `bonusRule ${i + 1}: ${r.name} Points ${r.points}${r.description ? ` ${r.description}` : ''}`)
    .join('\n');
}

export function formatBluffSettings(settings: BluffSetting[] | undefined): string {
  if (!settings || settings.length === 0) return '';
  return settings.map((s) => `${s.key}: ${s.value}`).join('\n');
}

export function formatMoveValidity(conditions: MoveValidityCondition[] | undefined): string {
  if (!conditions || conditions.length === 0) return '';
  return conditions.map((c) => `${c.key}: ${c.value}`).join('\n');
}

export function formatExampleHands(hands: ExampleHand[] | undefined): string {
  if (!hands || hands.length === 0) return '';
  return hands.map((h, i) => `${i + 1}. ${h.key}: ${h.value}`).join('\n');
}

export function buildSystemPrompt(config: PromptConfig, rules: GameRulesData): string {
  let s = `You are an AI playing ${config.gameDescription}\n\n`;
  s += `GAME RULES: ${rules.rulesLLM}\n\n`;
  const bonusRules = formatBonusRules(config.bonusRules);
  if (bonusRules) s += `BONUS RULES: ${bonusRules}\n\n`;
  const moveValidity = formatMoveValidity(config.moveValidityConditions);
  if (moveValidity) s += `MOVE VALIDITY: ${moveValidity}\n\n`;
  const bluffSettings = formatBluffSettings(config.bluffSettings);
  if (bluffSettings) s += `BLUFF SETTINGS: ${bluffSettings}\n\n`;
  const exampleHands = formatExampleHands(config.exampleHands);
  if (exampleHands) s += `EXAMPLE HANDS: ${exampleHands}\n\n`;
  if (config.strategyTips) s += `STRATEGY TIPS: ${config.strategyTips}\n\n`;
  return s.trim();
}

export function buildUserPrompt(state: GameStateData): string {
  let s = 'CURRENT GAME STATE:\n\n';
  s += `YOUR HAND: ${state.playerHand}\n`;
  s += `SCORE: ${state.scores}\n`;
  s += `REMAINING CARDS: ${state.remainingCards}\n`;
  s += `FLOOR CARDS: ${state.floorCards}\n`;
  s += `ALL PLAYERS: ${state.allPlayersData}\n`;
  return s.trim();
}
