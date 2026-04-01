import { z } from 'zod';
export declare const CardGameModeDataSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    scoringAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameRulesAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    strategyAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    cardRankingAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    layoutAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    gameInfoAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    deckAsset: z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    carouselImagesAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    mechanicsAsset: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    minHumanPlayers: z.ZodOptional<z.ZodNumber>;
    maxHumanPlayers: z.ZodOptional<z.ZodNumber>;
    supportsAI: z.ZodOptional<z.ZodBoolean>;
    aiCountsAsPlayer: z.ZodOptional<z.ZodBoolean>;
    baseBet: z.ZodOptional<z.ZodNumber>;
    defaultDealerIsSelf: z.ZodOptional<z.ZodBoolean>;
    initialNumberOfCards: z.ZodOptional<z.ZodNumber>;
    released: z.ZodOptional<z.ZodBoolean>;
    releaseStatus: z.ZodOptional<z.ZodEnum<["Alpha", "Beta", "Available", "ComingSoon", "InternalOnly"]>>;
    gameModeCategory: z.ZodOptional<z.ZodString>;
    bannerImage: z.ZodOptional<z.ZodString>;
    gameIcon: z.ZodOptional<z.ZodString>;
    listImageHash: z.ZodOptional<z.ZodString>;
    boxImageHash: z.ZodOptional<z.ZodString>;
    tableImageHash: z.ZodOptional<z.ZodString>;
    mobileTableImageHash: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
