import { z } from 'zod';

export const AssetLinkSchema = z
  .object({
    resourceEntryType: z.enum(['AssetResourceEntry', 'ImageResourceEntry', 'FileResourceEntry']).optional(),
    path: z.string().default(''),
    guid: z.string().optional(),
    checksum: z.string().optional(),
    assetType: z.string().optional(),
    displayName: z.string().optional(),
    gameId: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    fileSize: z.number().nullable().optional(),
    inheritanceChain: z.array(z.string()).nullable().optional(),
    variant: z.string().nullable().optional(),
  })
  .passthrough()
  .transform((value) => ({
    resourceEntryType: value.resourceEntryType ?? 'AssetResourceEntry',
    path: value.path,
    guid: value.guid,
    checksum: value.checksum,
    assetType: value.assetType,
    displayName: value.displayName,
    gameId: value.gameId,
    category: value.category,
    mimeType: value.mimeType,
    fileSize: value.fileSize ?? undefined,
    inheritanceChain: value.inheritanceChain,
    variant: value.variant,
  }));

export type AssetLink = z.infer<typeof AssetLinkSchema>;
