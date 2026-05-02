import { schema } from '@ocentra/schema-domain/effect-builder';
import { NoPlaceholdersValid } from '../shared/validation-guards';

export const ComingSoonDataSchema = schema.object({
    images: schema.array(schema.object({
        id: schema.string().min(1),
        label: schema.string().min(1).and(NoPlaceholdersValid).optional(),
        alt: schema.string().min(1).and(NoPlaceholdersValid).optional(),
        imageHash: schema.string()
    }))
});
