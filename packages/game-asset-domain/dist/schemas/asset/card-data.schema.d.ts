import { z } from 'zod';
export declare const CardDataSchema: z.ZodEffects<z.ZodObject<{
    pieceKind: z.ZodOptional<z.ZodLiteral<"Card">>;
    cardIdentity: z.ZodUnion<[z.ZodObject<{
        family: z.ZodLiteral<"French">;
        joker: z.ZodLiteral<true>;
        index: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>]>;
    }, "strip", z.ZodTypeAny, {
        index: 2 | 1;
        family: "French";
        joker: true;
    }, {
        index: 2 | 1;
        family: "French";
        joker: true;
    }>, z.ZodObject<{
        family: z.ZodLiteral<"French">;
        suit: z.ZodUnion<[z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>, z.ZodLiteral<"trumps">]>;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        suit: "spades" | "hearts" | "diamonds" | "clubs" | "trumps";
        family: "French";
    }, {
        value: number;
        suit: "spades" | "hearts" | "diamonds" | "clubs" | "trumps";
        family: "French";
    }>, z.ZodObject<{
        family: z.ZodLiteral<"Tarot">;
        kind: z.ZodLiteral<"trump">;
        number: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        number: number;
        kind: "trump";
        family: "Tarot";
    }, {
        number: number;
        kind: "trump";
        family: "Tarot";
    }>, z.ZodObject<{
        family: z.ZodLiteral<"Tarot">;
        kind: z.ZodLiteral<"minor">;
        suit: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        suit: string;
        kind: "minor";
        family: "Tarot";
    }, {
        value: number;
        suit: string;
        kind: "minor";
        family: "Tarot";
    }>, z.ZodObject<{
        family: z.ZodLiteral<"Tarot">;
        kind: z.ZodLiteral<"fool">;
    }, "strip", z.ZodTypeAny, {
        kind: "fool";
        family: "Tarot";
    }, {
        kind: "fool";
        family: "Tarot";
    }>, z.ZodEffects<z.ZodObject<{
        family: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        family: string;
    }, {
        id: string;
        family: string;
    }>, {
        id: string;
        family: string;
    }, {
        id: string;
        family: string;
    }>]>;
    imageHash: z.ZodEffects<z.ZodString, import("@ocentra/boundary-domain/types/asset-identifiers").ImageHash, string>;
    imagePath: z.ZodOptional<z.ZodString>;
    cardId: z.ZodEffects<z.ZodString, string, string>;
    cardRankingAsset: z.ZodObject<{
        path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        displayName: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        gameId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
        category: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
        mimeType: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
        fileSize: z.ZodOptional<z.ZodNumber>;
        createdAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        lastScanAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        checksum: z.ZodOptional<z.ZodEffects<z.ZodString, import("@ocentra/asset-domain/types/assetIdentifier").AssetChecksum | import("@ocentra/asset-domain/types/assetIdentifier").AssetHash, string>>;
        resourceEntryType: z.ZodOptional<z.ZodLiteral<"AssetResourceEntry">>;
        guid: z.ZodEffects<z.ZodString, import("@ocentra/boundary-domain/types/asset-identifiers").AssetGUIDType, string>;
        inheritanceChain: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodNull]>>;
        variant: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    } & {
        assetType: z.ZodLiteral<"CardRanking">;
    }, "strict", z.ZodTypeAny, {
        assetType: "CardRanking";
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        path: string;
        displayName?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        gameId?: string | null | undefined;
        category?: string | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        lastScanAt?: string | undefined;
        checksum?: import("@ocentra/asset-domain/types/assetIdentifier").AssetChecksum | import("@ocentra/asset-domain/types/assetIdentifier").AssetHash | undefined;
        resourceEntryType?: "AssetResourceEntry" | undefined;
        inheritanceChain?: string[] | null | undefined;
        variant?: string | null | undefined;
    }, {
        assetType: "CardRanking";
        guid: string;
        path: string;
        displayName?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        gameId?: string | null | undefined;
        category?: string | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        lastScanAt?: string | undefined;
        checksum?: string | undefined;
        resourceEntryType?: "AssetResourceEntry" | undefined;
        inheritanceChain?: string[] | null | undefined;
        variant?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    cardRankingAsset: {
        assetType: "CardRanking";
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        path: string;
        displayName?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        gameId?: string | null | undefined;
        category?: string | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        lastScanAt?: string | undefined;
        checksum?: import("@ocentra/asset-domain/types/assetIdentifier").AssetChecksum | import("@ocentra/asset-domain/types/assetIdentifier").AssetHash | undefined;
        resourceEntryType?: "AssetResourceEntry" | undefined;
        inheritanceChain?: string[] | null | undefined;
        variant?: string | null | undefined;
    };
    imageHash: string & {
        readonly __brand: "ImageHash";
    };
    cardIdentity: {
        value: number;
        suit: "spades" | "hearts" | "diamonds" | "clubs" | "trumps";
        family: "French";
    } | {
        index: 2 | 1;
        family: "French";
        joker: true;
    } | {
        number: number;
        kind: "trump";
        family: "Tarot";
    } | {
        value: number;
        suit: string;
        kind: "minor";
        family: "Tarot";
    } | {
        kind: "fool";
        family: "Tarot";
    } | {
        id: string;
        family: string;
    };
    cardId: string;
    pieceKind?: "Card" | undefined;
    imagePath?: string | undefined;
}, {
    cardRankingAsset: {
        assetType: "CardRanking";
        guid: string;
        path: string;
        displayName?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        gameId?: string | null | undefined;
        category?: string | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        lastScanAt?: string | undefined;
        checksum?: string | undefined;
        resourceEntryType?: "AssetResourceEntry" | undefined;
        inheritanceChain?: string[] | null | undefined;
        variant?: string | null | undefined;
    };
    imageHash: string;
    cardIdentity: {
        value: number;
        suit: "spades" | "hearts" | "diamonds" | "clubs" | "trumps";
        family: "French";
    } | {
        index: 2 | 1;
        family: "French";
        joker: true;
    } | {
        number: number;
        kind: "trump";
        family: "Tarot";
    } | {
        value: number;
        suit: string;
        kind: "minor";
        family: "Tarot";
    } | {
        kind: "fool";
        family: "Tarot";
    } | {
        id: string;
        family: string;
    };
    cardId: string;
    pieceKind?: "Card" | undefined;
    imagePath?: string | undefined;
}>, {
    cardRankingAsset: {
        assetType: "CardRanking";
        guid: string & {
            readonly __brand: "AssetGUID";
        };
        path: string;
        displayName?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        gameId?: string | null | undefined;
        category?: string | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        lastScanAt?: string | undefined;
        checksum?: import("@ocentra/asset-domain/types/assetIdentifier").AssetChecksum | import("@ocentra/asset-domain/types/assetIdentifier").AssetHash | undefined;
        resourceEntryType?: "AssetResourceEntry" | undefined;
        inheritanceChain?: string[] | null | undefined;
        variant?: string | null | undefined;
    };
    imageHash: string & {
        readonly __brand: "ImageHash";
    };
    cardIdentity: {
        value: number;
        suit: "spades" | "hearts" | "diamonds" | "clubs" | "trumps";
        family: "French";
    } | {
        index: 2 | 1;
        family: "French";
        joker: true;
    } | {
        number: number;
        kind: "trump";
        family: "Tarot";
    } | {
        value: number;
        suit: string;
        kind: "minor";
        family: "Tarot";
    } | {
        kind: "fool";
        family: "Tarot";
    } | {
        id: string;
        family: string;
    };
    cardId: string;
    pieceKind?: "Card" | undefined;
    imagePath?: string | undefined;
}, {
    cardRankingAsset: {
        assetType: "CardRanking";
        guid: string;
        path: string;
        displayName?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        gameId?: string | null | undefined;
        category?: string | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        lastScanAt?: string | undefined;
        checksum?: string | undefined;
        resourceEntryType?: "AssetResourceEntry" | undefined;
        inheritanceChain?: string[] | null | undefined;
        variant?: string | null | undefined;
    };
    imageHash: string;
    cardIdentity: {
        value: number;
        suit: "spades" | "hearts" | "diamonds" | "clubs" | "trumps";
        family: "French";
    } | {
        index: 2 | 1;
        family: "French";
        joker: true;
    } | {
        number: number;
        kind: "trump";
        family: "Tarot";
    } | {
        value: number;
        suit: string;
        kind: "minor";
        family: "Tarot";
    } | {
        kind: "fool";
        family: "Tarot";
    } | {
        id: string;
        family: string;
    };
    cardId: string;
    pieceKind?: "Card" | undefined;
    imagePath?: string | undefined;
}>;
