import { schema } from '@ocentra/schema-domain/effect-builder';
import { NoPlaceholdersValid } from '../shared/validation-guards';
import { SupportedDeckTriplesSchema } from './supported-deck-triples.schema';

const AssetResourceEntrySchema = schema.object({
    resourceEntryType: schema.string().optional(),
    path: schema.string().min(1),
    guid: schema.string().uuid().optional(),
    assetType: schema.string().min(1),
    displayName: schema.string().min(1).and(NoPlaceholdersValid).optional(),
    variant: schema.string().nullable().optional(),
}).passthrough();

const DeckCardMemberSchema = schema.object({
    cardTemplate: AssetResourceEntrySchema.extend({
        path: schema.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Card template path must end in .asset' }),
        assetType: schema.literal('Card'),
        displayName: schema.string().min(1).and(NoPlaceholdersValid),
    }),
    copies: schema.number().int().min(1),
});

const DeckPieceMemberSchema = schema.object({
    pieceTemplate: AssetResourceEntrySchema.extend({
        path: schema.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Piece template path must end in .asset' }),
        assetType: schema.string().min(1),
        displayName: schema.string().min(1).and(NoPlaceholdersValid).optional(),
    }),
    copies: schema.number().int().min(1),
    logicalId: schema.string().min(1).optional(),
    role: schema.string().min(1).optional(),
    tags: schema.array(schema.string().min(1)).default([]),
});

const DeckPresentationSchema = schema.object({
    backImageHash: schema.string().optional(),
    previewLayoutHint: schema.string().optional(),
    defaultOrientation: schema.string().optional(),
    defaultShape: schema.string().optional(),
}).passthrough();

const DeckRuntimePolicySchema = schema.object({
    shufflePolicy: schema.string().min(1).default('seeded_round_shuffle'),
    drawDirection: schema.string().min(1).default('top_is_index_0'),
    multiplicity: schema.number().int().min(1).default(1),
    visibilityDefaults: schema.record(schema.unknown()).default({}),
}).passthrough();

// Deck schema
export const DeckDataSchema = schema.object({
    name: schema.string().min(1).and(NoPlaceholdersValid),
    deckFamily: schema.string().min(1).default('french_cards'),
    pieceKind: schema.string().min(1).default('card'),
    supportedTriples: SupportedDeckTriplesSchema,
    composition: schema.array(DeckPieceMemberSchema).default([]),
    rankingAsset: AssetResourceEntrySchema.extend({
        assetType: schema.literal('DeckRanking'),
        guid: schema.string().uuid(),
    }).optional(),
    presentation: DeckPresentationSchema.default({}),
    runtimePolicy: DeckRuntimePolicySchema.default({}),
    cardTemplates: schema.array(
        AssetResourceEntrySchema.extend({
            path: schema.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Card template path must end in .asset' }),
            assetType: schema.literal('Card'),
            displayName: schema.string().min(1).and(NoPlaceholdersValid),
        })
    ).default([]),
    cardComposition: schema.array(DeckCardMemberSchema).default([]),
    cardRankingAsset: AssetResourceEntrySchema.extend({
        assetType: schema.literal('CardRanking'),
        guid: schema.string().uuid(),
    }).optional(),
    imageSourceFolderPath: schema.string().min(1).optional(),
    cardOutputPath: schema.string().min(1).optional(),
    backCardSourceFolderPath: schema.string().min(1).optional(),
    backCardHash: schema.string().optional(),
}).superRefine((data, ctx) => {
    if (data.composition.length === 0 && data.cardTemplates.length === 0 && data.cardComposition.length === 0) {
        ctx.addIssue({
            code: schema.IssueCode.custom,
            path: ['composition'],
            message: 'Deck must declare composition',
        });
    }

    if (!data.rankingAsset && !data.cardRankingAsset) {
        ctx.addIssue({
            code: schema.IssueCode.custom,
            path: ['rankingAsset'],
            message: 'Deck must declare rankingAsset',
        });
    }

    const totalCopies = data.cardComposition.reduce((sum, entry) => sum + entry.copies, 0);
    if (data.cardComposition.length > 0 && data.cardTemplates.length > 0 && data.cardTemplates.length !== totalCopies) {
        ctx.addIssue({
            code: schema.IssueCode.custom,
            path: ['cardComposition'],
            message: `cardComposition totals ${totalCopies} physical cards, but cardTemplates contains ${data.cardTemplates.length}; mixed mode must stay consistent`,
        });
    }
});
