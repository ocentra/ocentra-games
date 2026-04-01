import { z } from 'zod';
export declare const BonusRuleDataSchema: z.ZodObject<{
    minNumberOfCard: z.ZodNumber;
    bonusValue: z.ZodNumber;
    priority: z.ZodNumber;
    ruleName: z.ZodString;
    description: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    gameModeId: z.ZodString;
    examples: z.ZodOptional<z.ZodObject<{
        LLM: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        Player: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        LLM: string;
        Player: string;
    }, {
        LLM: string;
        Player: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    minNumberOfCard: number;
    bonusValue: number;
    priority: number;
    ruleName: string;
    gameModeId: string;
    examples?: {
        LLM: string;
        Player: string;
    } | undefined;
}, {
    description: string;
    minNumberOfCard: number;
    bonusValue: number;
    priority: number;
    ruleName: string;
    gameModeId: string;
    examples?: {
        LLM: string;
        Player: string;
    } | undefined;
}>;
