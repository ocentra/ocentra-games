import type { ReactNode, Ref } from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { FeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import type { ComingSoonItem } from '@ocentra/game-asset-domain/schemas/coming-soon-teaser-schema';
import type { FeaturedGameItem } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import { ComingSoonShowcase } from '../ComingSoonCarousel/ComingSoonShowcase';
import { FeatureBannerSection } from '../FeatureBanner/FeatureBannerSection';
import { FeaturedGameShowcase } from '../FeaturedGameCarousel/FeaturedGameShowcase';
import type {
  FeaturedGameShowcasePreviewLayoutMode,
  FeaturedShowcaseControls,
} from '../FeaturedGameCarousel/FeaturedGameShowcase.types';
import type {
  HomeShowcaseFrameControls,
  HomeShowcasePreviewLayoutMode,
} from '../HomeShowcaseFrame/HomeShowcaseFrame.types';
import type { ExploreGameSummary } from '../types/ExploreGameSummary';

type HomePagePreviewLayoutMode =
  | HomeShowcasePreviewLayoutMode
  | FeaturedGameShowcasePreviewLayoutMode;

export type HomePageShowcaseContentProps = {
  contentRef?: Ref<HTMLDivElement>;
  imageLoaders?: ReactNode;
  featureBannerItems: FeatureBannerItem[];
  featured: FeaturedGameItem[];
  recommended?: FeaturedGameItem[];
  comingSoon: ComingSoonItem[];
  catalogMontageItems?: ComingSoonItem[];
  availableNow: FeaturedGameItem[];
  explorerGames?: ExploreGameSummary[];
  isFeaturedLoading?: boolean;
  isComingSoonLoading?: boolean;
  resolveImageUrl: (hash: ImageHash) => string | null;
  aboutControls?: HomeShowcaseFrameControls;
  featuredControls?: FeaturedShowcaseControls;
  comingSoonControls?: FeaturedShowcaseControls;
  previewLayoutMode?: HomePagePreviewLayoutMode;
  onLearnMore?: (gameIdentifier: string) => void;
  onGameClick?: (gameIdentifier: string) => void;
  onExploreClick?: () => void;
  showExploreTile?: boolean;
  allowDebugBounds?: boolean;
  debugPageStructure?: boolean;
  debugLayout?: boolean;
  showContentSpacer?: boolean;
  scrollClassName?: string;
  contentClassName?: string;
  sectionClassName?: string;
  aboutSectionClassName?: string;
  featuredSectionClassName?: string;
  comingSoonSectionClassName?: string;
};

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function HomePageShowcaseContent({
  contentRef,
  imageLoaders,
  featureBannerItems,
  featured,
  recommended = [],
  comingSoon,
  catalogMontageItems = [],
  availableNow,
  explorerGames = [],
  isFeaturedLoading = false,
  isComingSoonLoading = false,
  resolveImageUrl,
  aboutControls,
  featuredControls,
  comingSoonControls,
  previewLayoutMode = 'auto',
  onLearnMore,
  onGameClick,
  onExploreClick,
  showExploreTile = false,
  allowDebugBounds = false,
  debugPageStructure = false,
  debugLayout = false,
  showContentSpacer = true,
  scrollClassName,
  contentClassName,
  sectionClassName,
  aboutSectionClassName,
  featuredSectionClassName,
  comingSoonSectionClassName,
}: HomePageShowcaseContentProps) {
  return (
    <>
      {imageLoaders}
      <div className={classNames('scrollable-content-container', scrollClassName)}>
        <div ref={contentRef} className={classNames('home-content', contentClassName)}>
          {debugPageStructure ? (
            <>
              <div className="page-debug-top">top</div>
              <div className="page-debug-middle">middle</div>
              <div className="page-debug-bottom">bottom</div>
            </>
          ) : debugLayout ? (
            <>
              <section className="about-us-section layout-debug-box" data-layout="about-us">
                <span>Feature banner</span>
              </section>
              <section className="featured-section layout-debug-box" data-layout="featured">
                <span>Featured carousel</span>
              </section>
              <section className="games-section layout-debug-box" data-layout="coming-soon">
                <span>Coming Soon carousel</span>
              </section>
            </>
          ) : (
            <>
              <section className={classNames('about-us-section', sectionClassName, aboutSectionClassName)}>
                <FeatureBannerSection
                  featureBannerItems={featureBannerItems}
                  resolveImageUrl={resolveImageUrl}
                  controls={aboutControls}
                  previewLayoutMode={previewLayoutMode}
                  allowDebugBounds={allowDebugBounds}
                />
              </section>
              <section className={classNames('featured-section', sectionClassName, featuredSectionClassName)}>
                <FeaturedGameShowcase
                  featured={featured}
                  recommended={recommended}
                  isLoading={isFeaturedLoading}
                  controls={featuredControls}
                  previewLayoutMode={previewLayoutMode}
                  onLearnMore={onLearnMore}
                  resolveImageUrl={resolveImageUrl}
                  allowDebugBounds={allowDebugBounds}
                />
              </section>
              <section className={classNames('games-section', sectionClassName, comingSoonSectionClassName)}>
                <ComingSoonShowcase
                  comingSoon={comingSoon}
                  catalogMontageItems={catalogMontageItems}
                  availableNow={availableNow}
                  explorerGames={explorerGames}
                  isLoading={isComingSoonLoading}
                  onGameClick={onGameClick}
                  onExploreClick={onExploreClick}
                  resolveImageUrl={resolveImageUrl}
                  showExploreTile={showExploreTile}
                  controls={comingSoonControls}
                  previewLayoutMode={previewLayoutMode}
                  allowDebugBounds={allowDebugBounds}
                />
              </section>
            </>
          )}
          {!debugPageStructure && showContentSpacer ? <div className="content-spacer" /> : null}
        </div>
      </div>
    </>
  );
}
