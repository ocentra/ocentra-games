import { schema } from '@ocentra/schema-domain/effect-builder';
import { containsPlaceholder } from '../shared/validation-guards';

const nonPlaceholderText = schema.string().trim().min(1).refine(
  (value) => !containsPlaceholder(value),
  { message: 'Text must not contain placeholder text (e.g., TBD, TODO, or bracketed text)' },
);

const moveValidityConditionsSchema = schema.union([
  schema.array(nonPlaceholderText),
  schema.record(schema.string().min(1), nonPlaceholderText),
]);

export const RulesDataSchema = schema.object({
  LLM: nonPlaceholderText.optional(),
  Player: nonPlaceholderText.optional(),
  objective: nonPlaceholderText.optional(),
  gameplay: nonPlaceholderText.optional(),
  keyRules: schema.array(nonPlaceholderText).optional(),
  moveValidityConditions: moveValidityConditionsSchema.nullable().optional(),
  exampleHands: schema.array(nonPlaceholderText).optional(),
  examples: schema.any().optional(),
  bonusRules: schema.string().trim().optional(),
  bonusRuleGuids: schema.array(schema.string().uuid()).optional(),
  useTrump: schema.boolean().optional(),
  trumpBonusValues: schema.record(schema.unknown()).nullable().optional(),
}).passthrough();
