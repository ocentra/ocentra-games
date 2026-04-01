import { z } from 'zod';
import { isAssetGUID, isAssetChecksum, isAssetHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { AssetTypeCategory, MimeTypes } from '@ocentra/asset-domain/constants/assets';
import { ResourceEntryType } from '@ocentra/asset-domain/resourceEntry/types';
import { NoPlaceholdersValid } from '@/schemas/shared/validation-guards';

export const AssetGuidSchema = z.string().refine(isAssetGUID, { message: 'must be a valid Asset GUID' });

export const AssetChecksumOrHashSchema = z.string().refine((v) => isAssetChecksum(v) || isAssetHash(v), {
  message: 'must be a valid Asset checksum or hash',
});

export const AssetTreePathSchema = z
  .string()
  .min(1)
  .refine((v) => v.startsWith('Resources/'), { message: 'must start with Resources/' })
  .refine((v) => v.endsWith('.asset'), { message: 'must end with .asset' });

export const AssetFolderPathSchema = z
  .string()
  .min(1)
  .refine((v) => v.startsWith('Resources/'), { message: 'must start with Resources/' })
  .refine((v) => !v.endsWith('.asset'), { message: 'must be a folder path, not a .asset path' });

export const IsoDateStringSchema = z
  .string()
  .min(1)
  .refine((v) => Number.isFinite(Date.parse(v)), { message: 'must be a valid ISO date string' });

export const AssetCategorySchema = z.enum(Object.values(AssetTypeCategory) as [string, ...string[]]);

export const MimeTypeSchema = z.enum(Object.values(MimeTypes) as [string, ...string[]]);

const BaseResourceEntrySchema = z.object({
  path: AssetTreePathSchema,
  displayName: z.string().min(1).and(NoPlaceholdersValid).optional(),
  gameId: z.union([z.string().min(1), z.null()]).optional(),
  category: AssetCategorySchema.optional(),
  mimeType: MimeTypeSchema.optional(),
  fileSize: z.number().int().min(0).optional(),
  createdAt: IsoDateStringSchema.optional(),
  updatedAt: IsoDateStringSchema.optional(),
  lastScanAt: IsoDateStringSchema.optional(),
  checksum: AssetChecksumOrHashSchema.optional(),
  resourceEntryType: z.literal(ResourceEntryType.AssetResourceEntry).optional(),
  guid: AssetGuidSchema,
  assetType: z.string().min(1),
  inheritanceChain: z.union([z.array(z.string().min(1)), z.null()]).optional(),
  variant: z.union([z.string().min(1), z.null()]).optional(),
}).strict();

export const AssetResourceEntrySchema = BaseResourceEntrySchema;

