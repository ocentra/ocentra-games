import type { Game } from '@/ui/pages/dev/CardGamesExplorer/types';
import { catalogSeoReplacementSlugsForAuthoredSlug } from '@/seo/generated/catalogSeoReplacements';

function normalizeIdentity(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function authoredCatalogKeys(game: Pick<Game, 'slug' | 'name' | 'alsoKnownAs'>): string[] {
  const replacementSlugs = new Set([
    ...catalogSeoReplacementSlugsForAuthoredSlug(normalizeIdentity(game.slug)),
    ...catalogSeoReplacementSlugsForAuthoredSlug(normalizeIdentity(game.name)),
  ]);
  return [
    game.slug,
    game.name,
    ...game.alsoKnownAs,
    ...replacementSlugs,
  ].map(normalizeIdentity).filter(Boolean);
}

export function catalogEntryKeys(entry: { slug: string; name: string; alsoKnownAs?: string[] }): string[] {
  return [
    entry.slug,
    entry.name,
    ...(entry.alsoKnownAs ?? []),
  ].map(normalizeIdentity).filter(Boolean);
}
