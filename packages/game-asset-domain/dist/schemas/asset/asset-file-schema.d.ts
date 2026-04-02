import { z } from 'zod';
export declare const AssetFileSchema: z.ZodObject<{
    system: z.ZodEffects<z.ZodObject<{
        guid: z.ZodEffects<z.ZodString, import("@ocentra/boundary-domain/types/asset-identifiers").AssetGUIDType, string>;
        assetType: z.ZodString;
        schemaVersion: z.ZodNumber;
        displayName: z.ZodString;
        category: z.ZodUnion<[z.ZodEnum<[string, ...string[]]>, z.ZodNativeEnum<{
            readonly Game: "Game";
            readonly Content: "Content";
            readonly UI: "UI";
            readonly AI: "AI";
        }>]>;
        icon: z.ZodOptional<z.ZodString>;
        treePath: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        gameId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        gameModeCategory: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPath: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    }, "strict", z.ZodTypeAny, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>;
    data: z.ZodAny;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    system: z.ZodEffects<z.ZodObject<{
        guid: z.ZodEffects<z.ZodString, import("@ocentra/boundary-domain/types/asset-identifiers").AssetGUIDType, string>;
        assetType: z.ZodString;
        schemaVersion: z.ZodNumber;
        displayName: z.ZodString;
        category: z.ZodUnion<[z.ZodEnum<[string, ...string[]]>, z.ZodNativeEnum<{
            readonly Game: "Game";
            readonly Content: "Content";
            readonly UI: "UI";
            readonly AI: "AI";
        }>]>;
        icon: z.ZodOptional<z.ZodString>;
        treePath: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        gameId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        gameModeCategory: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPath: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    }, "strict", z.ZodTypeAny, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>;
    data: z.ZodAny;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    system: z.ZodEffects<z.ZodObject<{
        guid: z.ZodEffects<z.ZodString, import("@ocentra/boundary-domain/types/asset-identifiers").AssetGUIDType, string>;
        assetType: z.ZodString;
        schemaVersion: z.ZodNumber;
        displayName: z.ZodString;
        category: z.ZodUnion<[z.ZodEnum<[string, ...string[]]>, z.ZodNativeEnum<{
            readonly Game: "Game";
            readonly Content: "Content";
            readonly UI: "UI";
            readonly AI: "AI";
        }>]>;
        icon: z.ZodOptional<z.ZodString>;
        treePath: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        gameId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        gameModeCategory: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPath: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    }, "strict", z.ZodTypeAny, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>;
    data: z.ZodAny;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Validates a complete .asset file JSON structure.
 * @param json The parsed JSON object of the .asset file
 * @returns Zod validation result
 */
export declare function validateAssetFile(json: unknown): z.SafeParseSuccess<z.objectOutputType<{
    system: z.ZodEffects<z.ZodObject<{
        guid: z.ZodEffects<z.ZodString, import("@ocentra/boundary-domain/types/asset-identifiers").AssetGUIDType, string>;
        assetType: z.ZodString;
        schemaVersion: z.ZodNumber;
        displayName: z.ZodString;
        category: z.ZodUnion<[z.ZodEnum<[string, ...string[]]>, z.ZodNativeEnum<{
            readonly Game: "Game";
            readonly Content: "Content";
            readonly UI: "UI";
            readonly AI: "AI";
        }>]>;
        icon: z.ZodOptional<z.ZodString>;
        treePath: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        gameId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        gameModeCategory: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPath: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    }, "strict", z.ZodTypeAny, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>;
    data: z.ZodAny;
}, z.ZodTypeAny, "passthrough">> | z.SafeParseError<z.objectInputType<{
    system: z.ZodEffects<z.ZodObject<{
        guid: z.ZodEffects<z.ZodString, import("@ocentra/boundary-domain/types/asset-identifiers").AssetGUIDType, string>;
        assetType: z.ZodString;
        schemaVersion: z.ZodNumber;
        displayName: z.ZodString;
        category: z.ZodUnion<[z.ZodEnum<[string, ...string[]]>, z.ZodNativeEnum<{
            readonly Game: "Game";
            readonly Content: "Content";
            readonly UI: "UI";
            readonly AI: "AI";
        }>]>;
        icon: z.ZodOptional<z.ZodString>;
        treePath: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        gameId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        gameModeCategory: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPath: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    }, "strict", z.ZodTypeAny, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>, {
        assetType: string;
        displayName: string;
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }, {
        assetType: string;
        displayName: string;
        guid: string;
        category: string;
        schemaVersion: number;
        treePath: string;
        gameId?: string | null | undefined;
        variant?: string | null | undefined;
        icon?: string | undefined;
        gameModeCategory?: string | undefined;
        parentPath?: string | undefined;
    }>;
    data: z.ZodAny;
}, z.ZodTypeAny, "passthrough">> | {
    success: boolean;
    error: z.ZodError<any>;
};
