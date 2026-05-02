import { schema } from '@ocentra/schema-domain/effect-builder';
import { NoPlaceholdersValid } from '../shared/validation-guards';

export const BonusRuleDataSchema = schema.object({
    minNumberOfCard: schema.number().int().min(1),
    bonusValue: schema.number().int().min(0),
    priority: schema.number().int().min(0),
    ruleName: schema.string().min(1),
    description: schema.string().min(10).and(NoPlaceholdersValid),
    gameModeId: schema.string().min(1),
    examples: schema.object({
        LLM: schema.string().min(20).and(NoPlaceholdersValid),
        Player: schema.string().min(20).and(NoPlaceholdersValid),
    }).optional()
});
