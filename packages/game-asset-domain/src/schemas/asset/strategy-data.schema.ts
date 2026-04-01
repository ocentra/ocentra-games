import { z } from 'zod';
import { NoPlaceholdersValid } from '../shared/validation-guards';

export const StrategyDataSchema = z.object({
    aggressiveness: z.number().min(0).max(1).optional(),
    riskTolerance: z.number().min(0).max(1).optional(),
    bluffFrequency: z.number().min(0).max(1).optional(),
    bluffSettings: z.record(z.string(), z.any()).optional(),
    LLM: z.string().min(20).and(NoPlaceholdersValid).optional(),
    Player: z.string().min(20).and(NoPlaceholdersValid).optional(),
    examples: z.any().optional(), // for legacy
}).passthrough().refine(data => {
    if (data.bluffSettings && typeof data.bluffSettings.minBluffHandStrength === 'number' && typeof data.bluffSettings.maxBluffHandStrength === 'number') {
        return data.bluffSettings.maxBluffHandStrength >= data.bluffSettings.minBluffHandStrength;
    }
    return true;
}, { message: 'maxBluffHandStrength cannot be less than minBluffHandStrength' });
