import { schema } from '@ocentra/schema-domain/effect-builder';

export const AppPageSliceStatusSchema = schema.enum(['draft', 'available', 'placeholder']);

export const AppPageSliceRendererSchema = schema.enum([
  'native',
  'svg-showcase',
  'placeholder',
]);

export const AppPageSliceSectionKindSchema = schema.enum([
  'hero',
  'showcase',
  'grid',
  'panel',
  'list',
  'cta',
  'placeholder',
]);

export const AppPageSliceLayoutSchema = schema.object({
  renderer: AppPageSliceRendererSchema.optional().default('placeholder'),
  blocks: schema.array(schema.string()).optional().default([]),
}).passthrough();

export const AppPageSliceSectionSchema = schema.object({
  id: schema.string(),
  kind: AppPageSliceSectionKindSchema.optional().default('placeholder'),
  title: schema.string().optional(),
  eyebrow: schema.string().optional(),
  body: schema.string().optional(),
  ctaLabel: schema.string().optional(),
  ctaRoute: schema.string().optional(),
  assetHashes: schema.array(schema.string()).optional(),
  enabled: schema.boolean().optional().default(true),
}).passthrough();

export const AppPageSliceDocumentSchema = schema.object({
  pageId: schema.string(),
  route: schema.string(),
  title: schema.string(),
  navLabel: schema.string().optional(),
  description: schema.string().optional(),
  status: AppPageSliceStatusSchema.optional().default('draft'),
  layout: AppPageSliceLayoutSchema.optional(),
  sections: schema.array(AppPageSliceSectionSchema).optional().default([]),
}).passthrough();

export type AppPageSliceDocument = schema.infer<typeof AppPageSliceDocumentSchema>;
