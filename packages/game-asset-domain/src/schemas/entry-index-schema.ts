import { schema } from '@ocentra/schema-domain/effect-builder';
import { GameCatalogEntrySchema } from '@/schemas/game-catalog-entry-schema';

export const AssetIndexResourceEntrySchema = schema.object({
  resourceEntryType: schema.enum(['AssetResourceEntry', 'ImageResourceEntry', 'FileResourceEntry']),
  path: schema.string(),
  guid: schema.string().optional(),
  hash: schema.string().optional(),
  checksum: schema.string().optional(),
  assetType: schema.string().optional(),
  displayName: schema.string().optional(),
  gameId: schema.string().nullable().optional(),
  category: schema.string().nullable().optional(),
  mimeType: schema.string().nullable().optional(),
  fileSize: schema.number().optional(),
  inheritanceChain: schema.array(schema.string()).nullable().optional(),
  variant: schema.string().nullable().optional(),
}).passthrough();

export const EntryIndexSchema = schema.object({
  generatedAt: schema.string(),
  resources: schema.array(AssetIndexResourceEntrySchema),
  games: schema.array(GameCatalogEntrySchema),
});

export type AssetIndexResourceEntry = schema.infer<typeof AssetIndexResourceEntrySchema>;
export type EntryIndexDocument = schema.infer<typeof EntryIndexSchema>;
