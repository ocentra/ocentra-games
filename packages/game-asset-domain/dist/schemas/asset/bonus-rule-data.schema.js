import { z } from 'zod';
import { NoPlaceholdersValid } from '../shared/validation-guards.js';
export const BonusRuleDataSchema = z.object({
    minNumberOfCard: z.number().int().min(1),
    bonusValue: z.number().int().min(0),
    priority: z.number().int().min(0),
    ruleName: z.string().min(1),
    description: z.string().min(10).and(NoPlaceholdersValid),
    gameModeId: z.string().min(1),
    examples: z.object({
        LLM: z.string().min(20).and(NoPlaceholdersValid),
        Player: z.string().min(20).and(NoPlaceholdersValid),
    }).optional()
});
