import { z } from 'zod';
import { containsPlaceholder } from '../shared/validation-guards.js';
const nonPlaceholderText = z.string().trim().min(1).refine((value) => !containsPlaceholder(value), { message: 'Text must not contain placeholder text (e.g., TBD, TODO, or bracketed text)' });
const moveValidityConditionsSchema = z.union([
    z.array(nonPlaceholderText),
    z.record(z.string().min(1), nonPlaceholderText),
]);
export const RulesDataSchema = z.object({
    LLM: nonPlaceholderText.optional(),
    Player: nonPlaceholderText.optional(),
    objective: nonPlaceholderText.optional(),
    gameplay: nonPlaceholderText.optional(),
    keyRules: z.array(nonPlaceholderText).optional(),
    moveValidityConditions: moveValidityConditionsSchema.nullable().optional(),
    exampleHands: z.array(nonPlaceholderText).optional(),
    examples: z.any().optional(),
    bonusRules: z.string().trim().optional(),
    bonusRuleGuids: z.array(z.string().uuid()).optional(),
    useTrump: z.boolean().optional(),
    trumpBonusValues: z.record(z.unknown()).nullable().optional(),
}).passthrough();
