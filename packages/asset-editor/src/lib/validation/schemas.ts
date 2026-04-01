import { z } from 'zod';
import { ValidationPattern } from '@ocentra/game-asset-domain/constants/validation-pattern';
import { CreateAssetError } from '@ocentra/asset-domain/constants/assets';

export const GameNameSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, { message: CreateAssetError.GameNameRequired });

export const GameIdSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, { message: CreateAssetError.GameIdRequired })
  .refine((s) => ValidationPattern.GameId.test(s), { message: CreateAssetError.GameIdInvalid });

export const AssetNameSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, { message: CreateAssetError.AssetNameRequired });

export const AssetRegistryResourceEntrySchema = z.object({
  guid: z.string().optional(),
  hash: z.string().optional(),
  checksum: z.string().optional(),
  path: z.string(),
  type: z.string().optional(),
  gameId: z.union([z.string(), z.null()]).optional(),
});

export const AssetRegistryDataSchema = z.object({
  system: z.object({ guid: z.string().optional() }).optional(),
  data: z.object({ resources: z.array(AssetRegistryResourceEntrySchema).optional() }).optional(),
  resources: z.array(AssetRegistryResourceEntrySchema).optional(),
});

export const AssetDocumentSchema = z
  .object({
    system: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const LayoutAssetRootSchema = z
  .object({
    system: z.record(z.unknown()).optional(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const AssetIndexEntrySchema = z.discriminatedUnion('resourceEntryType', [
  z.object({
    resourceEntryType: z.literal('AssetResourceEntry'),
    path: z.string(),
    guid: z.string(),
    assetType: z.string(),
    displayName: z.string(),
    fileSize: z.number(),
  }),
  z.object({
    resourceEntryType: z.literal('ImageResourceEntry'),
    path: z.string(),
    hash: z.string(),
    fileSize: z.number(),
  }),
  z.object({
    resourceEntryType: z.literal('FileResourceEntry'),
    path: z.string(),
    checksum: z.string(),
    fileSize: z.number(),
  }),
]);

export const AssetIndexSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  entries: z.array(AssetIndexEntrySchema),
});

export type AssetIndex = z.infer<typeof AssetIndexSchema>;
export type AssetIndexEntry = z.infer<typeof AssetIndexEntrySchema>;

export type AssetRegistryData = z.infer<typeof AssetRegistryDataSchema>;
export type AssetRegistryResourceEntry = z.infer<typeof AssetRegistryResourceEntrySchema>;
export type AssetDocument = z.infer<typeof AssetDocumentSchema>;
