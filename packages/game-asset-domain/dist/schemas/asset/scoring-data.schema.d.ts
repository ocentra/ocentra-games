import { z } from 'zod';
export declare const ScoringDataSchema: z.ZodObject<{
    cardRankingAsset: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>>;
    scoringType: z.ZodOptional<z.ZodString>;
    scoringFormula: z.ZodOptional<z.ZodString>;
    scoringRules: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    description: z.ZodOptional<z.ZodString>;
    patternMultipliers: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodNumber>>>;
    priorityOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    winCondition: z.ZodOptional<z.ZodString>;
    cardValues: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    penalties: z.ZodOptional<z.ZodString>;
    targetScore: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodNull]>>;
    scoringDirection: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    cardRankingAsset: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>>;
    scoringType: z.ZodOptional<z.ZodString>;
    scoringFormula: z.ZodOptional<z.ZodString>;
    scoringRules: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    description: z.ZodOptional<z.ZodString>;
    patternMultipliers: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodNumber>>>;
    priorityOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    winCondition: z.ZodOptional<z.ZodString>;
    cardValues: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    penalties: z.ZodOptional<z.ZodString>;
    targetScore: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodNull]>>;
    scoringDirection: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    cardRankingAsset: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
    }, z.ZodTypeAny, "passthrough">>>>;
    scoringType: z.ZodOptional<z.ZodString>;
    scoringFormula: z.ZodOptional<z.ZodString>;
    scoringRules: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    description: z.ZodOptional<z.ZodString>;
    patternMultipliers: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodNumber>>>;
    priorityOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    winCondition: z.ZodOptional<z.ZodString>;
    cardValues: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    penalties: z.ZodOptional<z.ZodString>;
    targetScore: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodNull]>>;
    scoringDirection: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
}, z.ZodTypeAny, "passthrough">>;
