import { z } from 'zod';
import { GameModeStatus } from '@/constants/game-mode-status';

const GameModeStatusSchema = z.enum([
  GameModeStatus.Available,
  GameModeStatus.ComingSoon,
  GameModeStatus.Maintenance,
  GameModeStatus.Deprecated,
]);

export const GameCatalogEntrySchema = z.object({
  gameId: z.string(),
  displayName: z.string(),
  guid: z.string(),
  path: z.string(),
  assetType: z.string(),
  mode: z.string(),
  enabled: z.boolean().optional(),
  releaseStatus: GameModeStatusSchema.nullable().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  deck: z.string().nullable().optional(),
  playersDisplay: z.string().nullable().optional(),
  playerMode: z.string().nullable().optional(),
  quality: z.string().nullable().optional(),
  completeness: z.record(z.string(), z.boolean()).optional(),
  description: z.string().optional(),
});

const ImageUrlsSchema = z.record(z.string(), z.string());

export const GameCatalogDocumentSchema = z.object({
  games: z.array(GameCatalogEntrySchema),
  imageUrls: ImageUrlsSchema.optional(),
});

export type GameCatalogEntry = z.infer<typeof GameCatalogEntrySchema>;
export type GameCatalogDocument = z.infer<typeof GameCatalogDocumentSchema>;
