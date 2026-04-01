import { z } from 'zod';
export declare const AIModelListDataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    defaultModelId: z.ZodOptional<z.ZodString>;
    defaultQuantPath: z.ZodOptional<z.ZodString>;
    models: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        displayName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
        enabled: z.ZodOptional<z.ZodBoolean>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        quants: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            dtype: z.ZodString;
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            dtype: string;
            enabled?: boolean | undefined;
        }, {
            path: string;
            dtype: string;
            enabled?: boolean | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        displayName: string;
        modelId: string;
        quants: {
            path: string;
            dtype: string;
            enabled?: boolean | undefined;
        }[];
        tags?: string[] | undefined;
        description?: string | undefined;
        provider?: string | undefined;
        enabled?: boolean | undefined;
    }, {
        displayName: string;
        modelId: string;
        quants: {
            path: string;
            dtype: string;
            enabled?: boolean | undefined;
        }[];
        tags?: string[] | undefined;
        description?: string | undefined;
        provider?: string | undefined;
        enabled?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    models: {
        displayName: string;
        modelId: string;
        quants: {
            path: string;
            dtype: string;
            enabled?: boolean | undefined;
        }[];
        tags?: string[] | undefined;
        description?: string | undefined;
        provider?: string | undefined;
        enabled?: boolean | undefined;
    }[];
    description?: string | undefined;
    defaultModelId?: string | undefined;
    defaultQuantPath?: string | undefined;
}, {
    name: string;
    models: {
        displayName: string;
        modelId: string;
        quants: {
            path: string;
            dtype: string;
            enabled?: boolean | undefined;
        }[];
        tags?: string[] | undefined;
        description?: string | undefined;
        provider?: string | undefined;
        enabled?: boolean | undefined;
    }[];
    description?: string | undefined;
    defaultModelId?: string | undefined;
    defaultQuantPath?: string | undefined;
}>;
