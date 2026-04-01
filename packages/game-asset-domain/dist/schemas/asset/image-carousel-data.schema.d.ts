import { z } from 'zod';
export declare const ImageCarouselDataSchema: z.ZodObject<{
    slides: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        alt: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        imageHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        alt: string;
        imageHash: string;
        label?: string | undefined;
    }, {
        id: string;
        alt: string;
        imageHash: string;
        label?: string | undefined;
    }>, "many">;
    autoplayIntervalMs: z.ZodOptional<z.ZodNumber>;
    lastImageDurationMs: z.ZodOptional<z.ZodNumber>;
    fastRotationDurationMs: z.ZodOptional<z.ZodNumber>;
    defaultRotationDurationMs: z.ZodOptional<z.ZodNumber>;
    fastRotationThreshold: z.ZodOptional<z.ZodNumber>;
    slideTransitionDelayMs: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    slides: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        alt: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        imageHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        alt: string;
        imageHash: string;
        label?: string | undefined;
    }, {
        id: string;
        alt: string;
        imageHash: string;
        label?: string | undefined;
    }>, "many">;
    autoplayIntervalMs: z.ZodOptional<z.ZodNumber>;
    lastImageDurationMs: z.ZodOptional<z.ZodNumber>;
    fastRotationDurationMs: z.ZodOptional<z.ZodNumber>;
    defaultRotationDurationMs: z.ZodOptional<z.ZodNumber>;
    fastRotationThreshold: z.ZodOptional<z.ZodNumber>;
    slideTransitionDelayMs: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    slides: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        alt: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        imageHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        alt: string;
        imageHash: string;
        label?: string | undefined;
    }, {
        id: string;
        alt: string;
        imageHash: string;
        label?: string | undefined;
    }>, "many">;
    autoplayIntervalMs: z.ZodOptional<z.ZodNumber>;
    lastImageDurationMs: z.ZodOptional<z.ZodNumber>;
    fastRotationDurationMs: z.ZodOptional<z.ZodNumber>;
    defaultRotationDurationMs: z.ZodOptional<z.ZodNumber>;
    fastRotationThreshold: z.ZodOptional<z.ZodNumber>;
    slideTransitionDelayMs: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
