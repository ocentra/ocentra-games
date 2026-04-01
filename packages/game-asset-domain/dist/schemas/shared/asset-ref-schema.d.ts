import { z } from 'zod';
export declare const AssetRefSchema: z.ZodEffects<z.ZodObject<{
    guid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assetType: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    typeId: z.ZodOptional<z.ZodEffects<z.ZodString, "AssetResourceEntry", string>>;
    assetRef: z.ZodOptional<z.ZodBoolean>;
    displayName: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    guid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assetType: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    typeId: z.ZodOptional<z.ZodEffects<z.ZodString, "AssetResourceEntry", string>>;
    assetRef: z.ZodOptional<z.ZodBoolean>;
    displayName: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    guid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assetType: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    typeId: z.ZodOptional<z.ZodEffects<z.ZodString, "AssetResourceEntry", string>>;
    assetRef: z.ZodOptional<z.ZodBoolean>;
    displayName: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    guid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assetType: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    typeId: z.ZodOptional<z.ZodEffects<z.ZodString, "AssetResourceEntry", string>>;
    assetRef: z.ZodOptional<z.ZodBoolean>;
    displayName: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    guid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assetType: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    typeId: z.ZodOptional<z.ZodEffects<z.ZodString, "AssetResourceEntry", string>>;
    assetRef: z.ZodOptional<z.ZodBoolean>;
    displayName: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
