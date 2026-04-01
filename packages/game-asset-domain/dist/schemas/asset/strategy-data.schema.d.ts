import { z } from 'zod';
export declare const StrategyDataSchema: z.ZodEffects<z.ZodObject<{
    aggressiveness: z.ZodOptional<z.ZodNumber>;
    riskTolerance: z.ZodOptional<z.ZodNumber>;
    bluffFrequency: z.ZodOptional<z.ZodNumber>;
    bluffSettings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    LLM: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    Player: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    examples: z.ZodOptional<z.ZodAny>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    aggressiveness: z.ZodOptional<z.ZodNumber>;
    riskTolerance: z.ZodOptional<z.ZodNumber>;
    bluffFrequency: z.ZodOptional<z.ZodNumber>;
    bluffSettings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    LLM: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    Player: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    examples: z.ZodOptional<z.ZodAny>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    aggressiveness: z.ZodOptional<z.ZodNumber>;
    riskTolerance: z.ZodOptional<z.ZodNumber>;
    bluffFrequency: z.ZodOptional<z.ZodNumber>;
    bluffSettings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    LLM: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    Player: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    examples: z.ZodOptional<z.ZodAny>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    aggressiveness: z.ZodOptional<z.ZodNumber>;
    riskTolerance: z.ZodOptional<z.ZodNumber>;
    bluffFrequency: z.ZodOptional<z.ZodNumber>;
    bluffSettings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    LLM: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    Player: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    examples: z.ZodOptional<z.ZodAny>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    aggressiveness: z.ZodOptional<z.ZodNumber>;
    riskTolerance: z.ZodOptional<z.ZodNumber>;
    bluffFrequency: z.ZodOptional<z.ZodNumber>;
    bluffSettings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    LLM: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    Player: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
    examples: z.ZodOptional<z.ZodAny>;
}, z.ZodTypeAny, "passthrough">>;
