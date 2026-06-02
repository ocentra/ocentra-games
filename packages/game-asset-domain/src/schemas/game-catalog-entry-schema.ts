import { schema } from '@ocentra/schema-domain/effect-builder';
import { GameModeStatus } from '@/constants/game-mode-status';

const GameModeStatusSchema = schema.nativeEnum(GameModeStatus);

export const GameCatalogEntrySchema = schema.object({
  gameId: schema.string(),
  displayName: schema.string(),
  guid: schema.string(),
  path: schema.string(),
  assetType: schema.string(),
  mode: schema.string(),
  enabled: schema.boolean().optional(),
  releaseStatus: GameModeStatusSchema.nullable().optional(),
  tags: schema.array(schema.string()).optional(),
  category: schema.string().nullable().optional(),
  subcategory: schema.string().nullable().optional(),
  difficulty: schema.string().nullable().optional(),
  duration: schema.string().nullable().optional(),
  deck: schema.string().nullable().optional(),
  playersDisplay: schema.string().nullable().optional(),
  playerMode: schema.string().nullable().optional(),
  quality: schema.string().nullable().optional(),
  completeness: schema.record(schema.string(), schema.boolean()).optional(),
  description: schema.string().optional(),
});

const ImageUrlsSchema = schema.record(schema.string(), schema.string());

export const GameCatalogDocumentSchema = schema.object({
  games: schema.array(GameCatalogEntrySchema),
  imageUrls: ImageUrlsSchema.optional(),
});

export type GameCatalogEntry = schema.infer<typeof GameCatalogEntrySchema>;
export type GameCatalogDocument = schema.infer<typeof GameCatalogDocumentSchema>;
