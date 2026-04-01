import { useAsset } from './useAsset';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { PageAssetLike } from '@/ui/components/GameInfo/types';

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
