import { schema } from '@ocentra/schema-domain/effect-builder';
import {
  parseProcessedGameTaxonomyPath,
  type ProcessedGameTaxonomyPath,
} from './ProcessedGameTaxonomyPath';

const GAME_MODE_CATEGORY_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;

export const GameModeAssetCategoryPathSchema = schema
  .string()
  .min(1)
  .refine((value) => value.replace(/\\/g, '/').split('/').every((segment) => GAME_MODE_CATEGORY_SEGMENT_PATTERN.test(segment)), {
    message: 'must use resource-folder path segments',
  })
  .brand<'GameModeAssetCategoryPath'>();

export type GameModeAssetCategoryPath = schema.infer<typeof GameModeAssetCategoryPathSchema> | ProcessedGameTaxonomyPath;

export function parseGameModeAssetCategoryPath(value: unknown): GameModeAssetCategoryPath {
  if (typeof value !== 'string') {
    return GameModeAssetCategoryPathSchema.parse(value);
  }
  const normalized = value
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
  if (normalized.toLowerCase().startsWith('cardgames/games/')) {
    return parseProcessedGameTaxonomyPath(normalized);
  }
  return GameModeAssetCategoryPathSchema.parse(normalized);
}
