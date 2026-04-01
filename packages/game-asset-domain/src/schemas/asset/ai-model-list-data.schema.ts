import { z } from 'zod';

export const AIModelListDataSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    defaultModelId: z.string().optional(),
    defaultQuantPath: z.string().optional(),
    models: z.array(z.object({
        modelId: z.string().min(1),
        displayName: z.string().min(1),
        description: z.string().optional(),
        provider: z.string().optional(),
        enabled: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        quants: z.array(z.object({
            path: z.string().min(1),
            dtype: z.string().min(1),
            enabled: z.boolean().optional()
        })).min(1)
    }))
});
