import { useAsset } from './useAsset';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { HeroSection, PageSection } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';

interface PageAssetLike {
  hero?: HeroSection | null;
  sections?: PageSection[];
}

type PageContentAsset = ScriptableObject & PageAssetLike;

const PageContentAssetConstructor = ScriptableObject as unknown as new () => PageContentAsset;

export function usePageContent(
  pageId: string | null,
  gameId?: string
): PageContentAsset | null {
  const path = pageId
    ? gameId
      ? `/Resources/GameMode/CardGames/${gameId.toLowerCase()}/${pageId === 'info' ? 'info' : pageId.toLowerCase()}.asset`
      : `/Resources/Pages/${pageId === 'info' ? 'info' : pageId.toLowerCase()}.asset`
    : null;

  return useAsset(PageContentAssetConstructor, path);
}
