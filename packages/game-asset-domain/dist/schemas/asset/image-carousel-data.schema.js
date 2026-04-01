import { z } from 'zod';
import { NoPlaceholdersValid } from '../shared/validation-guards.js';
const ImageCarouselSlideSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1).and(NoPlaceholdersValid).optional(),
    alt: z.string().min(1).and(NoPlaceholdersValid),
    imageHash: z.string()
});
export const ImageCarouselDataSchema = z.object({
    slides: z.array(ImageCarouselSlideSchema),
    autoplayIntervalMs: z.number().int().min(1000).max(30000).optional(),
    lastImageDurationMs: z.number().int().min(1000).optional(),
    fastRotationDurationMs: z.number().int().min(250).optional(),
    defaultRotationDurationMs: z.number().int().min(250).optional(),
    fastRotationThreshold: z.number().int().min(1).optional(),
    slideTransitionDelayMs: z.number().int().min(0).optional(),
}).passthrough();
