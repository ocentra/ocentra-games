let assetCatalogPreviewModulePromise: Promise<typeof import('./AssetCatalogPreview')> | null = null;
let gameRegistryPreviewModulePromise: Promise<typeof import('./GameRegistryPreview')> | null = null;
let deckManagerPreviewModulePromise: Promise<typeof import('@/lib/assets/deck/DeckManagerPreview')> | null = null;
let deckPreviewModulePromise: Promise<typeof import('@/lib/assets/card/deck/DeckPreview')> | null = null;
let cardPreviewModulePromise: Promise<typeof import('@/lib/assets/card/cardBase/CardPreview')> | null = null;
let cardRankingPreviewModulePromise: Promise<typeof import('@/lib/assets/card/cardRanking/CardRankingPreview')> | null = null;
let imageListPreviewModulePromise: Promise<typeof import('./ImageListPreview')> | null = null;
let imageCarouselPreviewModulePromise: Promise<typeof import('./ImageCarouselPreview')> | null = null;
let cardGameLayoutPreviewModulePromise: Promise<typeof import('./CardGameLayoutPreview')> | null = null;
let cardGameMechanicsPreviewModulePromise: Promise<typeof import('./CardGameMechanicsPreview')> | null = null;
let gameInfoTabsModulePromise: Promise<typeof import('@/ui/components/GameInfo/GameInfoTabs')> | null = null;

export const loadAssetCatalogPreviewModule = () => assetCatalogPreviewModulePromise ??= import('./AssetCatalogPreview');
export const loadGameRegistryPreviewModule = () => gameRegistryPreviewModulePromise ??= import('./GameRegistryPreview');
export const loadDeckManagerPreviewModule = () => deckManagerPreviewModulePromise ??= import('@/lib/assets/deck/DeckManagerPreview');
export const loadDeckPreviewModule = () => deckPreviewModulePromise ??= import('@/lib/assets/card/deck/DeckPreview');
export const loadCardPreviewModule = () => cardPreviewModulePromise ??= import('@/lib/assets/card/cardBase/CardPreview');
export const loadCardRankingPreviewModule = () => cardRankingPreviewModulePromise ??= import('@/lib/assets/card/cardRanking/CardRankingPreview');
export const loadImageListPreviewModule = () => imageListPreviewModulePromise ??= import('./ImageListPreview');
export const loadImageCarouselPreviewModule = () => imageCarouselPreviewModulePromise ??= import('./ImageCarouselPreview');
export const loadCardGameLayoutPreviewModule = () => cardGameLayoutPreviewModulePromise ??= import('./CardGameLayoutPreview');
export const loadCardGameMechanicsPreviewModule = () => cardGameMechanicsPreviewModulePromise ??= import('./CardGameMechanicsPreview');
export const loadGameInfoTabsModule = () => gameInfoTabsModulePromise ??= import('@/ui/components/GameInfo/GameInfoTabs');

export function preloadPreviewPanelModules() {
  void Promise.allSettled([
    loadAssetCatalogPreviewModule(),
    loadGameRegistryPreviewModule(),
    loadDeckManagerPreviewModule(),
    loadDeckPreviewModule(),
    loadCardPreviewModule(),
    loadCardRankingPreviewModule(),
    loadImageListPreviewModule(),
    loadImageCarouselPreviewModule(),
    loadCardGameLayoutPreviewModule(),
    loadCardGameMechanicsPreviewModule(),
    loadGameInfoTabsModule(),
  ]);
}
