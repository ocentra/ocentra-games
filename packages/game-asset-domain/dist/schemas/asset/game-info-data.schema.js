import { z } from 'zod';
import { NoPlaceholdersValid } from '../shared/validation-guards.js';
const textSchema = z.string().trim().min(1).and(NoPlaceholdersValid);
const contentBlockSchema = z.object({
    type: z.string().min(1),
}).passthrough();
const pageSchema = z.object({
    title: textSchema,
    subtitle: z.string().trim().optional(),
    content: z.array(contentBlockSchema).optional(),
    linkedAssets: z.array(z.string().uuid()).optional(),
    assetRefs: z.array(z.record(z.unknown())).optional(),
}).passthrough();
const sectionSchema = z.object({
    type: z.string().min(1),
    tabLabel: z.string().min(1),
    pages: z.array(pageSchema).optional(),
    subtitle: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
}).passthrough();
export const GameInfoDataSchema = z.object({
    hero: z.object({
        title: textSchema,
        subtitle: z.string().trim().optional(),
        backgroundImageRef: z.union([z.string(), z.record(z.unknown())]).optional(),
        ctaButtons: z.array(z.record(z.unknown())).optional(),
    }).optional(),
    sections: z.array(sectionSchema).optional(),
    description: z.string().trim().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    comingSoon: z.boolean().optional(),
    minPlayers: z.number().int().nullable().optional(),
    maxPlayers: z.number().int().nullable().optional(),
    routePath: z.string().optional(),
    LLM: z.string().trim().optional(),
    Player: z.string().trim().optional(),
    tagline: z.string().trim().optional(),
    tagline2: z.string().trim().optional(),
    shortDescription: z.string().trim().optional(),
    gameIconImage: z.string().optional(),
    gameCategory: z.string().optional(),
    subcategory: z.union([z.string(), z.null()]).optional(),
    playerMode: z.string().optional(),
    difficulty: z.string().optional(),
    duration: z.string().optional(),
    origin: z.string().optional(),
    deck: z.string().optional(),
    alsoKnownAs: z.array(z.string().trim()).optional(),
    playersDisplay: z.string().optional(),
    historyContent: z.record(z.unknown()).nullable().optional(),
    setupContent: z.record(z.unknown()).nullable().optional(),
    variationsContent: z.record(z.unknown()).nullable().optional(),
    aiContent: z.record(z.unknown()).nullable().optional(),
    sourcesContent: z.record(z.unknown()).nullable().optional(),
    quality: z.union([z.string(), z.null()]).optional(),
    completeness: z.record(z.boolean()).nullable().optional(),
    synthesisManifest: z.object({
        lastSynthesizedAt: z.union([z.string(), z.null()]).optional(),
        dependencies: z.array(z.object({
            guid: z.string().uuid(),
            checksum: z.string(),
        })).optional(),
    }).optional(),
}).passthrough();
