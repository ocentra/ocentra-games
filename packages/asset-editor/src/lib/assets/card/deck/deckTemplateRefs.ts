import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';

type RawTemplateRef =
  | AssetResourceEntry<unknown>
  | { guid?: string; ref?: string | { guid?: string } }
  | null
  | undefined;

type RawCompositionEntry = {
  cardTemplate?: RawTemplateRef;
  copies?: number;
};

export function extractDeckTemplateRefs(
  cardTemplates: unknown,
  cardComposition: unknown
): RawTemplateRef[] {
  const directTemplates = Array.isArray(cardTemplates) ? (cardTemplates as RawTemplateRef[]) : [];
  if (directTemplates.length > 0) {
    return directTemplates;
  }

  if (!Array.isArray(cardComposition)) {
    return [];
  }

  const expanded: RawTemplateRef[] = [];
  for (const item of cardComposition as RawCompositionEntry[]) {
    if (!item?.cardTemplate) {
      continue;
    }
    const count = Math.max(1, Number(item.copies ?? 1));
    for (let i = 0; i < count; i += 1) {
      expanded.push(item.cardTemplate);
    }
  }
  return expanded;
}
