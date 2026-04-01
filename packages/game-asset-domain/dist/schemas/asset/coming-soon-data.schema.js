import { z } from 'zod';
import { NoPlaceholdersValid } from '../shared/validation-guards.js';
export const ComingSoonDataSchema = z.object({
    images: z.array(z.object({
        id: z.string().min(1),
        label: z.string().min(1).and(NoPlaceholdersValid).optional(),
        alt: z.string().min(1).and(NoPlaceholdersValid).optional(),
        imageHash: z.string()
    }))
});
