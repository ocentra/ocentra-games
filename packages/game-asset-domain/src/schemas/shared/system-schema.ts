import { z } from 'zod';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import {
  AssetGuidSchema,
  AssetFolderPathSchema,
  AssetTreePathSchema,
  AssetCategorySchema,
} from '@/schemas/asset/shared/brand-schemas';

export const AssetSystemSchema = z.object({
  guid: AssetGuidSchema,
  assetType: z.string().min(1, { message: 'system.assetType is required' }),
  schemaVersion: z.number().int().min(1),
  displayName: z.string().min(1, { message: 'system.displayName is required' }),
  category: AssetCategorySchema
    .or(z.nativeEnum(AssetTypeCategory, { message: 'system.category must be a valid AssetTypeCategory' })),
  icon: z.string().optional(),
  treePath: AssetTreePathSchema,
  gameId: z.string().nullable().optional(),
  gameModeCategory: z.string().optional(),
  variant: z.string().nullable().optional(),
  parentPath: AssetFolderPathSchema.optional(),
}).strict().superRefine((s, ctx) => {
  if (s.parentPath) {
    const treePath = typeof s.treePath === 'string' ? s.treePath : '';
    const expectedPrefix = `${s.parentPath}/`;
    if (!treePath.startsWith(expectedPrefix)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['treePath'],
        message: `treePath must be under parentPath (${expectedPrefix})`,
      });
    }
  }
});
