import { schema } from '@ocentra/schema-domain/effect-builder';

export const AIModelListDataSchema = schema.object({
    name: schema.string().min(1),
    description: schema.string().optional(),
    defaultModelId: schema.string().optional(),
    defaultQuantPath: schema.string().optional(),
    models: schema.array(schema.object({
        modelId: schema.string().min(1),
        displayName: schema.string().min(1),
        description: schema.string().optional(),
        provider: schema.string().optional(),
        enabled: schema.boolean().optional(),
        tags: schema.array(schema.string()).optional(),
        quants: schema.array(schema.object({
            path: schema.string().min(1),
            dtype: schema.string().min(1),
            enabled: schema.boolean().optional()
        })).min(1)
    }))
});
