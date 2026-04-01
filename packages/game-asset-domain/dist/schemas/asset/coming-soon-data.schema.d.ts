import { z } from 'zod';
export declare const ComingSoonDataSchema: z.ZodObject<{
    images: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        alt: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        imageHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        imageHash: string;
        label?: string | undefined;
        alt?: string | undefined;
    }, {
        id: string;
        imageHash: string;
        label?: string | undefined;
        alt?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    images: {
        id: string;
        imageHash: string;
        label?: string | undefined;
        alt?: string | undefined;
    }[];
}, {
    images: {
        id: string;
        imageHash: string;
        label?: string | undefined;
        alt?: string | undefined;
    }[];
}>;
