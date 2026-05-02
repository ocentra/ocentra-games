import { schema } from '@ocentra/schema-domain/effect-builder';
import { NoPlaceholdersValid } from '../shared/validation-guards';

export const StrategyDataSchema = schema.object({
    aggressiveness: schema.number().min(0).max(1).optional(),
    riskTolerance: schema.number().min(0).max(1).optional(),
    bluffFrequency: schema.number().min(0).max(1).optional(),
    bluffSettings: schema.record(schema.string(), schema.any()).optional(),
    LLM: schema.string().min(20).and(NoPlaceholdersValid).optional(),
    Player: schema.string().min(20).and(NoPlaceholdersValid).optional(),
    examples: schema.any().optional(), // for legacy
}).passthrough().refine(data => {
    if (data.bluffSettings && typeof data.bluffSettings.minBluffHandStrength === 'number' && typeof data.bluffSettings.maxBluffHandStrength === 'number') {
        return data.bluffSettings.maxBluffHandStrength >= data.bluffSettings.minBluffHandStrength;
    }
    return true;
}, { message: 'maxBluffHandStrength cannot be less than minBluffHandStrength' });
