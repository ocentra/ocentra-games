import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { Layout, type LayoutStructure } from '@/ui/layout/Layout';
import {
  DEFAULT_SELECTED_GAME_CONTENT_PLAN,
  type SelectedGameContentPlan,
  type SelectedGameLayoutControls,
} from '@/ui/selectedGame/SelectedGamePresentation';

export type PageLayoutKind =
  | 'home'
  | 'shop'
  | 'social'
  | 'games'
  | 'game-catalog'
  | 'tournaments'
  | 'competition'
  | 'leaderboard'
  | 'game-leaderboard'
  | 'ai-benchmark-leaderboard'
  | 'profile'
  | 'player-hub'
  | 'admin'
  | 'settings'
  | 'lobby'
  | 'matchmaking'
  | 'tournament-detail'
  | 'selected-game'
  | 'generic';

export type PageLayoutSliceType =
  | 'about'
  | 'featured-games'
  | 'coming-soon'
  | 'available-now'
  | 'catalog-montage'
  | 'selected-game'
  | 'custom';

export interface PageLayoutSlice {
  id: string;
  type: PageLayoutSliceType;
  enabled: boolean;
  order: number;
  title?: string;
  sourceAssetPath?: string;
  controlsAssetPath?: string;
}

export interface PageLayoutDocument {
  pageId: string;
  routePath: string;
  title: string;
  kind: PageLayoutKind;
  slices: PageLayoutSlice[];
  layout: LayoutStructure;
  pageControls?: {
    accentColor?: string;
    panelOpacity?: number;
    density?: number;
    stageScale?: number;
    heroOffsetY?: number;
    showGuides?: boolean;
  };
  layoutControls?: SelectedGameLayoutControls;
  contentPlan?: SelectedGameContentPlan;
  preview?: {
    sampleGameRef?: {
      gameId: string;
      guid: string;
      path: string;
    };
    debugBounds?: boolean;
  };
}

const DEFAULT_PAGE_LAYOUT_DOCUMENT: PageLayoutDocument = {
  pageId: 'home',
  routePath: '/',
  title: 'Home',
  kind: 'home',
  slices: [
    {
      id: 'about-us',
      type: 'about',
      enabled: true,
      order: 10,
      title: 'About Us',
      sourceAssetPath: 'Resources/Content/Home/FeatureBanner.asset',
      controlsAssetPath: 'Resources/Pages/HomePageLayout.asset#about',
    },
    {
      id: 'featured-games',
      type: 'featured-games',
      enabled: true,
      order: 20,
      title: 'Featured Games',
      sourceAssetPath: 'Resources/GameCatalog/index/home.json',
      controlsAssetPath: 'Resources/Pages/HomePageLayout.asset#featured',
    },
    {
      id: 'coming-soon',
      type: 'coming-soon',
      enabled: true,
      order: 30,
      title: 'Coming Soon',
      sourceAssetPath: 'Resources/Pages/ComingSoon.asset',
      controlsAssetPath: 'Resources/Pages/HomePageLayout.asset#coming-soon',
    },
  ],
  layout: {
    type: 'custom',
    sections: [
      { id: 'about-us', type: 'about', order: 10 },
      { id: 'featured-games', type: 'featured-games', order: 20 },
      { id: 'coming-soon', type: 'coming-soon', order: 30 },
    ],
  },
};

function cloneDefaultPageLayoutDocument(): PageLayoutDocument {
  return JSON.parse(JSON.stringify(DEFAULT_PAGE_LAYOUT_DOCUMENT)) as PageLayoutDocument;
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'PageLayout',
  displayName: 'Page Layout',
  icon: 'Page',
  category: AssetTypeCategory.UI,
})
export class PageLayout extends Layout {
  static override schemaVersion = 1;
  static override readonly requiresInspector = false;

  static override createTemplate(): Record<string, unknown> {
    return cloneDefaultPageLayoutDocument() as unknown as Record<string, unknown>;
  }

  @serializable({ label: 'Page ID' })
  pageId: string = DEFAULT_PAGE_LAYOUT_DOCUMENT.pageId;

  @serializable({ label: 'Route Path' })
  routePath: string = DEFAULT_PAGE_LAYOUT_DOCUMENT.routePath;

  @serializable({ label: 'Title' })
  title: string = DEFAULT_PAGE_LAYOUT_DOCUMENT.title;

  @serializable({ label: 'Kind' })
  kind: PageLayoutKind = DEFAULT_PAGE_LAYOUT_DOCUMENT.kind;

  @serializable({ label: 'Slices' })
  slices: PageLayoutSlice[] = cloneDefaultPageLayoutDocument().slices;

  @serializable({ label: 'Layout' })
  override layout: LayoutStructure = cloneDefaultPageLayoutDocument().layout;

  @serializable({ label: 'Page Controls' })
  pageControls: PageLayoutDocument['pageControls'] = undefined;

  @serializable({ label: 'Layout Controls' })
  layoutControls: SelectedGameLayoutControls = {};

  @serializable({ label: 'Content Plan' })
  contentPlan: SelectedGameContentPlan = DEFAULT_SELECTED_GAME_CONTENT_PLAN;

  @serializable({ label: 'Preview' })
  preview: PageLayoutDocument['preview'] = undefined;
}
