import { schema } from '@ocentra/schema-domain/effect-builder';
import { isAssetGUID, isAssetChecksum, isAssetHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { AssetTypeCategory, MimeTypes } from '@ocentra/asset-domain/constants/assets';
import { ResourceEntryType } from '@ocentra/asset-domain/resourceEntry/types';
import { NoPlaceholdersValid } from '@/schemas/shared/validation-guards';

export const AssetGuidSchema = schema.string().refine(isAssetGUID, { message: 'must be a valid Asset GUID' });

export const AssetChecksumOrHashSchema = schema.string().refine((v) => isAssetChecksum(v) || isAssetHash(v), {
  message: 'must be a valid Asset checksum or hash',
});

export const AssetTreePathSchema = schema
  .string()
  .min(1)
  .refine((v) => v.startsWith('Resources/'), { message: 'must start with Resources/' })
  .refine((v) => v.endsWith('.asset'), { message: 'must end with .asset' });

export const AssetFolderPathSchema = schema
  .string()
  .min(1)
  .refine((v) => v.startsWith('Resources/'), { message: 'must start with Resources/' })
  .refine((v) => !v.endsWith('.asset'), { message: 'must be a folder path, not a .asset path' });

export const IsoDateStringSchema = schema
  .string()
  .min(1)
  .refine((v) => Number.isFinite(Date.parse(v)), { message: 'must be a valid ISO date string' });

export const AssetCategorySchema = schema.enum(Object.values(AssetTypeCategory) as [string, ...string[]]);

export const MimeTypeSchema = schema.enum(Object.values(MimeTypes) as [string, ...string[]]);

const BaseResourceEntrySchema = schema.object({
  path: AssetTreePathSchema,
  displayName: schema.string().min(1).and(NoPlaceholdersValid).optional(),
  gameId: schema.union([schema.string().min(1), schema.null()]).optional(),
  category: AssetCategorySchema.optional(),
  mimeType: MimeTypeSchema.optional(),
  fileSize: schema.number().int().min(0).optional(),
  createdAt: IsoDateStringSchema.optional(),
  updatedAt: IsoDateStringSchema.optional(),
  lastScanAt: IsoDateStringSchema.optional(),
  checksum: AssetChecksumOrHashSchema.optional(),
  resourceEntryType: schema.literal(ResourceEntryType.AssetResourceEntry).optional(),
  guid: AssetGuidSchema,
  assetType: schema.string().min(1),
  inheritanceChain: schema.union([schema.array(schema.string().min(1)), schema.null()]).optional(),
  variant: schema.union([schema.string().min(1), schema.null()]).optional(),
}).strict();

export const AssetResourceEntrySchema = BaseResourceEntrySchema;

