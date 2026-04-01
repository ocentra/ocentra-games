import { z } from 'zod';
export declare const GameInfoDataSchema: z.ZodObject<{
    hero: z.ZodOptional<z.ZodObject<{
        title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        subtitle: z.ZodOptional<z.ZodString>;
        backgroundImageRef: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
        ctaButtons: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        subtitle?: string | undefined;
        backgroundImageRef?: string | Record<string, unknown> | undefined;
        ctaButtons?: Record<string, unknown>[] | undefined;
    }, {
        title: string;
        subtitle?: string | undefined;
        backgroundImageRef?: string | Record<string, unknown> | undefined;
        ctaButtons?: Record<string, unknown>[] | undefined;
    }>>;
    sections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    comingSoon: z.ZodOptional<z.ZodBoolean>;
    minPlayers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    maxPlayers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    routePath: z.ZodOptional<z.ZodString>;
    LLM: z.ZodOptional<z.ZodString>;
    Player: z.ZodOptional<z.ZodString>;
    tagline: z.ZodOptional<z.ZodString>;
    tagline2: z.ZodOptional<z.ZodString>;
    shortDescription: z.ZodOptional<z.ZodString>;
    gameIconImage: z.ZodOptional<z.ZodString>;
    gameCategory: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    playerMode: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodString>;
    deck: z.ZodOptional<z.ZodString>;
    alsoKnownAs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    playersDisplay: z.ZodOptional<z.ZodString>;
    historyContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    setupContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    variationsContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    aiContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    sourcesContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    quality: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    completeness: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodBoolean>>>;
    synthesisManifest: z.ZodOptional<z.ZodObject<{
        lastSynthesizedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
        dependencies: z.ZodOptional<z.ZodArray<z.ZodObject<{
            guid: z.ZodString;
            checksum: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            guid: string;
            checksum: string;
        }, {
            guid: string;
            checksum: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        lastSynthesizedAt?: string | null | undefined;
        dependencies?: {
            guid: string;
            checksum: string;
        }[] | undefined;
    }, {
        lastSynthesizedAt?: string | null | undefined;
        dependencies?: {
            guid: string;
            checksum: string;
        }[] | undefined;
    }>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    hero: z.ZodOptional<z.ZodObject<{
        title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        subtitle: z.ZodOptional<z.ZodString>;
        backgroundImageRef: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
        ctaButtons: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        subtitle?: string | undefined;
        backgroundImageRef?: string | Record<string, unknown> | undefined;
        ctaButtons?: Record<string, unknown>[] | undefined;
    }, {
        title: string;
        subtitle?: string | undefined;
        backgroundImageRef?: string | Record<string, unknown> | undefined;
        ctaButtons?: Record<string, unknown>[] | undefined;
    }>>;
    sections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    comingSoon: z.ZodOptional<z.ZodBoolean>;
    minPlayers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    maxPlayers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    routePath: z.ZodOptional<z.ZodString>;
    LLM: z.ZodOptional<z.ZodString>;
    Player: z.ZodOptional<z.ZodString>;
    tagline: z.ZodOptional<z.ZodString>;
    tagline2: z.ZodOptional<z.ZodString>;
    shortDescription: z.ZodOptional<z.ZodString>;
    gameIconImage: z.ZodOptional<z.ZodString>;
    gameCategory: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    playerMode: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodString>;
    deck: z.ZodOptional<z.ZodString>;
    alsoKnownAs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    playersDisplay: z.ZodOptional<z.ZodString>;
    historyContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    setupContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    variationsContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    aiContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    sourcesContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    quality: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    completeness: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodBoolean>>>;
    synthesisManifest: z.ZodOptional<z.ZodObject<{
        lastSynthesizedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
        dependencies: z.ZodOptional<z.ZodArray<z.ZodObject<{
            guid: z.ZodString;
            checksum: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            guid: string;
            checksum: string;
        }, {
            guid: string;
            checksum: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        lastSynthesizedAt?: string | null | undefined;
        dependencies?: {
            guid: string;
            checksum: string;
        }[] | undefined;
    }, {
        lastSynthesizedAt?: string | null | undefined;
        dependencies?: {
            guid: string;
            checksum: string;
        }[] | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    hero: z.ZodOptional<z.ZodObject<{
        title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        subtitle: z.ZodOptional<z.ZodString>;
        backgroundImageRef: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
        ctaButtons: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        subtitle?: string | undefined;
        backgroundImageRef?: string | Record<string, unknown> | undefined;
        ctaButtons?: Record<string, unknown>[] | undefined;
    }, {
        title: string;
        subtitle?: string | undefined;
        backgroundImageRef?: string | Record<string, unknown> | undefined;
        ctaButtons?: Record<string, unknown>[] | undefined;
    }>>;
    sections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodString;
        tabLabel: z.ZodString;
        pages: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
            subtitle: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                type: z.ZodString;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            linkedAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        subtitle: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    comingSoon: z.ZodOptional<z.ZodBoolean>;
    minPlayers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    maxPlayers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    routePath: z.ZodOptional<z.ZodString>;
    LLM: z.ZodOptional<z.ZodString>;
    Player: z.ZodOptional<z.ZodString>;
    tagline: z.ZodOptional<z.ZodString>;
    tagline2: z.ZodOptional<z.ZodString>;
    shortDescription: z.ZodOptional<z.ZodString>;
    gameIconImage: z.ZodOptional<z.ZodString>;
    gameCategory: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    playerMode: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodString>;
    deck: z.ZodOptional<z.ZodString>;
    alsoKnownAs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    playersDisplay: z.ZodOptional<z.ZodString>;
    historyContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    setupContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    variationsContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    aiContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    sourcesContent: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    quality: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    completeness: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodBoolean>>>;
    synthesisManifest: z.ZodOptional<z.ZodObject<{
        lastSynthesizedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
        dependencies: z.ZodOptional<z.ZodArray<z.ZodObject<{
            guid: z.ZodString;
            checksum: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            guid: string;
            checksum: string;
        }, {
            guid: string;
            checksum: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        lastSynthesizedAt?: string | null | undefined;
        dependencies?: {
            guid: string;
            checksum: string;
        }[] | undefined;
    }, {
        lastSynthesizedAt?: string | null | undefined;
        dependencies?: {
            guid: string;
            checksum: string;
        }[] | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">>;
