export interface CatalogSeoReplacement {
  authoredSlug: string;
  catalogSlugs: readonly string[];
}

export const catalogSeoReplacements = [
  {
    "authoredSlug": "three-card-brag",
    "catalogSlugs": [
      "brag-3-card"
    ]
  }
] satisfies readonly CatalogSeoReplacement[];

const catalogSeoReplacementLookup = new Map(
  catalogSeoReplacements.flatMap(entry => entry.catalogSlugs.map(slug => [slug, entry.authoredSlug] as const)),
);

export function findAuthoredSlugForCatalogSlug(slug: string): string | undefined {
  return catalogSeoReplacementLookup.get(slug);
}

export function catalogSeoReplacementSlugsForAuthoredSlug(authoredSlug: string): readonly string[] {
  return catalogSeoReplacements.find(entry => entry.authoredSlug === authoredSlug)?.catalogSlugs ?? [];
}
