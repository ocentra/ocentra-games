import { z } from 'zod';
export declare const CardRankingDataSchema: z.ZodEffects<z.ZodObject<{
    deckType: z.ZodString;
    expectedCardCount: z.ZodNumber;
    includesJokers: z.ZodBoolean;
    backCardCount: z.ZodOptional<z.ZodNumber>;
    deckFamily: z.ZodString;
    cardEntries: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        copies: z.ZodOptional<z.ZodNumber>;
        suit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rank: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
        label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        order: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        points: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        kind: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label?: string | null | undefined;
        copies?: number | undefined;
        suit?: string | null | undefined;
        rank?: string | number | null | undefined;
        order?: number | null | undefined;
        points?: number | null | undefined;
        kind?: string | null | undefined;
    }, {
        id: string;
        label?: string | null | undefined;
        copies?: number | undefined;
        suit?: string | null | undefined;
        rank?: string | number | null | undefined;
        order?: number | null | undefined;
        points?: number | null | undefined;
        kind?: string | null | undefined;
    }>, "many">>;
    familyPayload: z.ZodOptional<z.ZodObject<{
        french: z.ZodObject<{
            suits: z.ZodArray<z.ZodObject<{
                SuitName: z.ZodString;
                SuitSymbol: z.ZodString;
                SuitColor: z.ZodEnum<["Black", "Red", "None"]>;
                DisplayOrder: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }, {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }>, "many">;
            rankings: z.ZodArray<z.ZodObject<{
                CardName: z.ZodString;
                Value: z.ZodNumber;
                CardSymbol: z.ZodString;
                DisplayOrder: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }, {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            suits: {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }[];
            rankings: {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }[];
        }, {
            suits: {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }[];
            rankings: {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }[];
        }>;
    }, "strip", z.ZodTypeAny, {
        french: {
            suits: {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }[];
            rankings: {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }[];
        };
    }, {
        french: {
            suits: {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }[];
            rankings: {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }[];
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    deckType: string;
    expectedCardCount: number;
    includesJokers: boolean;
    deckFamily: string;
    backCardCount?: number | undefined;
    cardEntries?: {
        id: string;
        label?: string | null | undefined;
        copies?: number | undefined;
        suit?: string | null | undefined;
        rank?: string | number | null | undefined;
        order?: number | null | undefined;
        points?: number | null | undefined;
        kind?: string | null | undefined;
    }[] | undefined;
    familyPayload?: {
        french: {
            suits: {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }[];
            rankings: {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }[];
        };
    } | undefined;
}, {
    deckType: string;
    expectedCardCount: number;
    includesJokers: boolean;
    deckFamily: string;
    backCardCount?: number | undefined;
    cardEntries?: {
        id: string;
        label?: string | null | undefined;
        copies?: number | undefined;
        suit?: string | null | undefined;
        rank?: string | number | null | undefined;
        order?: number | null | undefined;
        points?: number | null | undefined;
        kind?: string | null | undefined;
    }[] | undefined;
    familyPayload?: {
        french: {
            suits: {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }[];
            rankings: {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }[];
        };
    } | undefined;
}>, {
    deckType: string;
    expectedCardCount: number;
    includesJokers: boolean;
    deckFamily: string;
    backCardCount?: number | undefined;
    cardEntries?: {
        id: string;
        label?: string | null | undefined;
        copies?: number | undefined;
        suit?: string | null | undefined;
        rank?: string | number | null | undefined;
        order?: number | null | undefined;
        points?: number | null | undefined;
        kind?: string | null | undefined;
    }[] | undefined;
    familyPayload?: {
        french: {
            suits: {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }[];
            rankings: {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }[];
        };
    } | undefined;
}, {
    deckType: string;
    expectedCardCount: number;
    includesJokers: boolean;
    deckFamily: string;
    backCardCount?: number | undefined;
    cardEntries?: {
        id: string;
        label?: string | null | undefined;
        copies?: number | undefined;
        suit?: string | null | undefined;
        rank?: string | number | null | undefined;
        order?: number | null | undefined;
        points?: number | null | undefined;
        kind?: string | null | undefined;
    }[] | undefined;
    familyPayload?: {
        french: {
            suits: {
                SuitName: string;
                SuitSymbol: string;
                SuitColor: "Black" | "Red" | "None";
                DisplayOrder: number;
            }[];
            rankings: {
                DisplayOrder: number;
                CardName: string;
                Value: number;
                CardSymbol: string;
            }[];
        };
    } | undefined;
}>;
