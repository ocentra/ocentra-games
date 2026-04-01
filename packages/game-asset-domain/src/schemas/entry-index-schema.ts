import { z } from 'zod';
import { GameCatalogEntrySchema } from '@/schemas/game-catalog-entry-schema';

export const AssetIndexResourceEntrySchema = z.object({
  resourceEntryType: z.enum(['AssetResourceEntry', 'ImageResourceEntry', 'FileResourceEntry']),
  path: z.string(),
  guid: z.string().optional(),
  hash: z.string().optional(),
  checksum: z.string().optional(),
  assetType: z.string().optional(),
  displayName: z.string().optional(),
  gameId: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().optional(),
  inheritanceChain: z.array(z.string()).nullable().optional(),
  variant: z.string().nullable().optional(),
}).passthrough();

export const EntryIndexSchema = z.object({
  generatedAt: z.string(),
  resources: z.array(AssetIndexResourceEntrySchema),
  games: z.array(GameCatalogEntrySchema),
});

export type AssetIndexResourceEntry = z.infer<typeof AssetIndexResourceEntrySchema>;
export type EntryIndexDocument = z.infer<typeof EntryIndexSchema>;
