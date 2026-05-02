import { schema } from '@ocentra/schema-domain/effect-builder';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import {
  AssetGuidSchema,
  AssetFolderPathSchema,
  AssetTreePathSchema,
  AssetCategorySchema,
} from '@/schemas/asset/shared/brand-schemas';

export const AssetSystemSchema = schema.object({
  guid: AssetGuidSchema,
  assetType: schema.string().min(1, { message: 'system.assetType is required' }),
  schemaVersion: schema.number().int().min(1),
  displayName: schema.string().min(1, { message: 'system.displayName is required' }),
  category: AssetCategorySchema
    .or(schema.nativeEnum(AssetTypeCategory, { message: 'system.category must be a valid AssetTypeCategory' })),
  icon: schema.string().optional(),
  treePath: AssetTreePathSchema,
  gameId: schema.string().nullable().optional(),
  gameModeCategory: schema.string().optional(),
  variant: schema.string().nullable().optional(),
  parentPath: AssetFolderPathSchema.optional(),
}).strict().superRefine((s, ctx) => {
  if (s.parentPath) {
    const treePath = typeof s.treePath === 'string' ? s.treePath : '';
    const expectedPrefix = `${s.parentPath}/`;
    if (!treePath.startsWith(expectedPrefix)) {
      ctx.addIssue({
        code: schema.IssueCode.custom,
        path: ['treePath'],
        message: `treePath must be under parentPath (${expectedPrefix})`,
      });
    }
  }
});
