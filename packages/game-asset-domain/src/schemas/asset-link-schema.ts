import { schema } from '@ocentra/schema-domain/effect-builder';

export const AssetLinkSchema = schema
  .object({
    resourceEntryType: schema.enum(['AssetResourceEntry', 'ImageResourceEntry', 'FileResourceEntry']).optional(),
    path: schema.string().default(''),
    guid: schema.string().optional(),
    checksum: schema.string().optional(),
    assetType: schema.string().optional(),
    displayName: schema.string().optional(),
    gameId: schema.string().nullable().optional(),
    category: schema.string().nullable().optional(),
    mimeType: schema.string().nullable().optional(),
    fileSize: schema.number().nullable().optional(),
    inheritanceChain: schema.array(schema.string()).nullable().optional(),
    variant: schema.string().nullable().optional(),
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

export type AssetLink = schema.infer<typeof AssetLinkSchema>;
