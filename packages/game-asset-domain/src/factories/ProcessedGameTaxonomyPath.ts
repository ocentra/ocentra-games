import { schema } from '@ocentra/schema-domain/effect-builder';

export const PROCESSED_GAME_CATEGORY_ROOT = 'CardGames/Games' as const;

const PROCESSED_GAME_TAXONOMY_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ProcessedGameTaxonomyPathSchema = schema
  .string()
  .min(PROCESSED_GAME_CATEGORY_ROOT.length + 2)
  .refine((value) => value.startsWith(`${PROCESSED_GAME_CATEGORY_ROOT}/`), {
    message: `must start with ${PROCESSED_GAME_CATEGORY_ROOT}/`,
  })
  .refine((value) => value.slice(PROCESSED_GAME_CATEGORY_ROOT.length + 1).split('/').every((segment) => PROCESSED_GAME_TAXONOMY_SEGMENT_PATTERN.test(segment)), {
    message: 'must use lowercase slug folder segments',
  })
  .brand<'ProcessedGameTaxonomyPath'>();

export type ProcessedGameTaxonomyPath = schema.infer<typeof ProcessedGameTaxonomyPathSchema>;

export function parseProcessedGameTaxonomyPath(value: unknown): ProcessedGameTaxonomyPath {
  if (typeof value !== 'string') {
    return ProcessedGameTaxonomyPathSchema.parse(value);
  }
  const segments = value
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/');
  const normalized = segments.length >= 3
    && segments[0]?.toLowerCase() === 'cardgames'
    && segments[1]?.toLowerCase() === 'games'
    ? `${PROCESSED_GAME_CATEGORY_ROOT}/${segments.slice(2).map((segment) => segment.toLowerCase()).join('/')}`
    : segments.join('/');
  return ProcessedGameTaxonomyPathSchema.parse(normalized);
}
