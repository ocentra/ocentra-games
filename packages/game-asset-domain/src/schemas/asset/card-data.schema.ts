import { schema } from '@ocentra/schema-domain/effect-builder';
import { Suit } from '@ocentra/game-domain/types/game';
import { PieceKind } from '@/pieces/PieceKind';
import { ImageHashSchema } from '@/schemas/asset/shared/image-hash-schema';
import { ImagePathSchema } from '@/schemas/asset/shared/image-path-schema';
import { CardIdSchema } from '@/schemas/asset/shared/card-id-schema';
import { AssetResourceEntrySchema } from '@/schemas/asset/shared/brand-schemas';
import { DECK_FAMILY_TAROT } from '@ocentra/game-domain/deck/cardIdentity';

const FrenchCardIdentitySchema = schema.object({
  family: schema.literal('French'),
  suit: schema.union([schema.enum([Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS]), schema.literal('trumps')]),
  value: schema.number().int().min(2).max(14),
});

const FrenchJokerIdentitySchema = schema.object({
  family: schema.literal('French'),
  joker: schema.literal(true),
  index: schema.union([schema.literal(1), schema.literal(2)]),
});

const TarotTrumpIdentitySchema = schema.object({
  family: schema.literal(DECK_FAMILY_TAROT),
  kind: schema.literal('trump'),
  number: schema.number().int().min(1).max(21),
});

const TarotMinorIdentitySchema = schema.object({
  family: schema.literal(DECK_FAMILY_TAROT),
  kind: schema.literal('minor'),
  suit: schema.string().min(1),
  value: schema.number().int().min(1).max(15),
});

const TarotFoolIdentitySchema = schema.object({
  family: schema.literal(DECK_FAMILY_TAROT),
  kind: schema.literal('fool'),
});

const familyIdPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const familyPrefix = (family: string): string =>
  family.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const allowedGenericFamilies = new Set([
  'Cego',
  'Chinese_domino',
  'Dominoes',
  'E_awase',
  'FiveHundred_63',
  'Four_color',
  'Ganjifa',
  'German',
  'Gnav',
  'Goita',
  'Hanafuda',
  'Hanafuda_snow',
  'Hols_der_Geier_colors',
  'Italian',
  'Kabufuda',
  'Khanhoo',
  'Khorol',
  'Madiao',
  'Mahjong',
  'Minchiate',
  'Money-suited',
  'Numbered_104',
  'Okey',
  'Portuguese',
  'Rook_colors',
  'Spanish',
  'Tarot_minor',
  'Tehonbiki',
  'Tiddlywink_colors',
  'Uta_garuta',
  'Whot',
  'Xiangqi_red_black',
]);

const GenericIdentitySchema = schema.object({
  family: schema.string().min(1),
  id: schema.string().regex(familyIdPattern),
}).superRefine((value, ctx) => {
  if (!allowedGenericFamilies.has(value.family)) {
    ctx.addIssue({
      code: schema.IssueCode.custom,
      path: ['family'],
      message: `generic cardIdentity.family must be one of known non-French families: ${Array.from(allowedGenericFamilies).join(', ')}`,
    });
    return;
  }
  const prefix = familyPrefix(value.family);
  if (!value.id.startsWith(`${prefix}_`)) {
    ctx.addIssue({
      code: schema.IssueCode.custom,
      path: ['id'],
      message: `generic cardIdentity.id must start with "${prefix}_" for family "${value.family}"`,
    });
  }
});

const CardDataFieldsSchema = schema.object({
    pieceKind: schema.literal(PieceKind.Card).optional(),
    cardIdentity: schema.union([FrenchJokerIdentitySchema, FrenchCardIdentitySchema, TarotTrumpIdentitySchema, TarotMinorIdentitySchema, TarotFoolIdentitySchema, GenericIdentitySchema]),
    imageHash: ImageHashSchema,
    imagePath: ImagePathSchema.optional(),
    cardId: CardIdSchema,
    rankingAsset: AssetResourceEntrySchema.extend({
        assetType: schema.literal('DeckRanking'),
    }).optional(),
    cardRankingAsset: AssetResourceEntrySchema.extend({
        assetType: schema.literal('CardRanking'),
    }).optional(),
});

type CardDataFields = schema.infer<typeof CardDataFieldsSchema>;

export const CardDataSchema = CardDataFieldsSchema.superRefine((d: CardDataFields, ctx) => {
    if ('kind' in d.cardIdentity && d.cardIdentity.family === DECK_FAMILY_TAROT && d.cardIdentity.kind === 'minor') {
      const expected = `${d.cardIdentity.value}_of_${d.cardIdentity.suit}`;
      if (d.cardId !== expected) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: ['cardId'],
          message: `cardId must equal "${expected}" for tarot cardIdentity`,
        });
      }
      return;
    }
    if ('kind' in d.cardIdentity && d.cardIdentity.family === DECK_FAMILY_TAROT) {
      const expected = d.cardIdentity.kind === 'fool'
        ? 'tarot_fool'
        : `tarot_trump_${d.cardIdentity.number}`;
      if (d.cardId !== expected) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: ['cardId'],
          message: `cardId must equal "${expected}" for tarot cardIdentity`,
        });
      }
      return;
    }
    if ('id' in d.cardIdentity) {
      if (d.cardId !== d.cardIdentity.id) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: ['cardId'],
          message: `cardId must equal "${d.cardIdentity.id}" for generic cardIdentity`,
        });
      }
      return;
    }
    if ('joker' in d.cardIdentity && d.cardIdentity.joker) {
      const expected = `joker_${d.cardIdentity.index}`;
      if (d.cardId !== expected) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: ['cardId'],
          message: `cardId must equal "${expected}" for joker cardIdentity`,
        });
      }
      return;
    }
    const identity = d.cardIdentity as { family: 'French'; suit: string; value: number };
    const expected = `${identity.value}_of_${identity.suit}`;
    if (d.cardId !== expected) {
        ctx.addIssue({
            code: schema.IssueCode.custom,
            path: ['cardId'],
            message: `cardId must equal "${expected}" for cardIdentity`,
        });
    }
});
