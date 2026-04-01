import { z } from 'zod';
import { NoPlaceholdersValid } from '../shared/validation-guards';
import { SupportedDeckTriplesSchema } from './supported-deck-triples.schema';

const AssetResourceEntrySchema = z.object({
    resourceEntryType: z.string().optional(),
    path: z.string().min(1),
    guid: z.string().uuid().optional(),
    assetType: z.string().min(1),
    displayName: z.string().min(1).and(NoPlaceholdersValid).optional(),
    variant: z.string().nullable().optional(),
}).passthrough();

const DeckCardMemberSchema = z.object({
    cardTemplate: AssetResourceEntrySchema.extend({
        path: z.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Card template path must end in .asset' }),
        assetType: z.literal('Card'),
        displayName: z.string().min(1).and(NoPlaceholdersValid),
    }),
    copies: z.number().int().min(1),
});

// Deck schema
export const DeckDataSchema = z.object({
    name: z.string().min(1).and(NoPlaceholdersValid),
    supportedTriples: SupportedDeckTriplesSchema,
    cardTemplates: z.array(
        AssetResourceEntrySchema.extend({
            path: z.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Card template path must end in .asset' }),
            assetType: z.literal('Card'),
            displayName: z.string().min(1).and(NoPlaceholdersValid),
        })
    ).default([]),
    cardComposition: z.array(DeckCardMemberSchema).default([]),
    cardRankingAsset: AssetResourceEntrySchema.extend({
        assetType: z.literal('CardRanking'),
        guid: z.string().uuid(),
    }),
    imageSourceFolderPath: z.string().min(1),
    cardOutputPath: z.string().min(1),
    backCardSourceFolderPath: z.string().min(1),
    backCardHash: z.string(),
}).superRefine((data, ctx) => {
    if (data.cardTemplates.length === 0 && data.cardComposition.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['cardTemplates'],
            message: 'Deck must declare cardTemplates or cardComposition',
        });
    }
    for (const [index, triple] of data.supportedTriples.entries()) {
        if (
            triple.suitSet === 'Dominoes' ||
            triple.suitSet === 'Chinese_domino' ||
            triple.suitSet === 'Hanafuda' ||
            triple.suitSet === 'Hanafuda_snow' ||
            triple.suitSet === 'Kabufuda' ||
            triple.suitSet === 'Mahjong'
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['supportedTriples', index],
                message: `generic Deck assets must not claim specialized tile/traditional triples such as ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
            });
        }
    }

    const totalCopies = data.cardComposition.reduce((sum, entry) => sum + entry.copies, 0);
    if (data.cardComposition.length > 0 && data.cardTemplates.length > 0 && data.cardTemplates.length !== totalCopies) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['cardComposition'],
            message: `cardComposition totals ${totalCopies} physical cards, but cardTemplates contains ${data.cardTemplates.length}; mixed mode must stay consistent`,
        });
    }
});
