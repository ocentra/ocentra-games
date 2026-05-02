import { useMemo, type CSSProperties } from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { FeaturedGameItem } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type { ComingSoonItem } from '@ocentra/game-asset-domain/schemas/coming-soon-teaser-schema';
import type { ExploreGameSummary } from '../types/ExploreGameSummary';
import { GameBannerImage } from '../GameBannerImage/GameBannerImage';
import { FeaturedGameShowcase } from '../FeaturedGameCarousel/FeaturedGameShowcase';
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  type FeaturedGameShowcasePreviewLayoutMode,
  type FeaturedShowcaseControls,
  type FeaturedShowcaseMediaSlot,
  type FeaturedShowcaseSideBSlot,
} from '../FeaturedGameCarousel/FeaturedGameShowcase.types';
import './ComingSoonShowcase.css';

export interface ComingSoonShowcaseProps {
  comingSoon: ComingSoonItem[];
  availableNow: FeaturedGameItem[];
  explorerGames?: ExploreGameSummary[];
  isLoading?: boolean;
  onGameClick?: (gameIdentifier: string) => void;
  onExploreClick?: () => void;
  resolveImageUrl: (hash: ImageHash) => string | null;
  showExploreTile?: boolean;
  catalogMontageItems?: ComingSoonItem[];
  controls?: FeaturedShowcaseControls;
  allowDebugBounds?: boolean;
  previewLayoutMode?: FeaturedGameShowcasePreviewLayoutMode;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getTeaserGame(item: ComingSoonItem): FeaturedGameItem {
  return {
    gameId: item.id,
    guid: item.id,
    name: item.name,
    enabled: true,
    releaseStatus: 'ComingSoon',
    comingSoon: true,
    tags: ['Coming Soon'],
    shortDescription: item.alt ?? `${item.name} is being prepared for the Ocentra catalog.`,
    description: item.alt ?? `${item.name} is being prepared for the Ocentra catalog.`,
    bannerImage: item.bannerImage,
    featuredTopBadges: [{ label: 'COMING SOON', tone: 'bannerGold' }],
    featuredBottomBadges: [{ label: 'COMING SOON', tone: 'gold' }],
  };
}

function renderCardImage(
  src: string | undefined,
  title: string,
  resolveImageUrl: (hash: ImageHash) => string | null,
) {
  if (!src) {
    return <div className="coming-soon-showcase__image-fallback">{getInitials(title)}</div>;
  }
  if (src.startsWith('/') || src.startsWith('http')) {
    return <img src={src} alt={title} loading="lazy" />;
  }
  if (isImageHash(src)) {
    return (
      <GameBannerImage
        src={src}
        alt={title}
        className="coming-soon-showcase__resolved-image"
        resolveImageUrl={resolveImageUrl}
      />
    );
  }
  return <div className="coming-soon-showcase__image-fallback">{getInitials(title)}</div>;
}

function getDescription(game: FeaturedGameItem): string {
  return game.shortDescription ?? game.description ?? `${game.name} is part of the Ocentra game catalog.`;
}

function normalizeButtonAlign(value: string): 'start' | 'center' | 'end' {
  return value === 'center' || value === 'end' ? value : 'start';
}

export function ComingSoonShowcase({
  comingSoon,
  availableNow,
  isLoading = false,
  onGameClick,
  onExploreClick,
  resolveImageUrl,
  showExploreTile = true,
  catalogMontageItems = [],
  controls,
  allowDebugBounds = false,
  previewLayoutMode = 'auto',
}: ComingSoonShowcaseProps) {
  const c = useMemo(() => ({
    sideA: {
      ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA,
      ...controls?.sideA,
    },
    sideB: {
      ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideB,
      ...controls?.sideB,
    },
  }), [controls]);
  const comingSoonGames = useMemo(
    () => comingSoon.map(getTeaserGame),
    [comingSoon]
  );
  const catalogMontageGames = useMemo(
    () => catalogMontageItems.map(getTeaserGame),
    [catalogMontageItems]
  );

  const renderMedia = (slot: FeaturedShowcaseMediaSlot) => {
    const currentList = slot.game.comingSoon ? comingSoonGames : availableNow;
    const cards = currentList.length > 0 ? currentList : [slot.game];
    const imageRatio = Math.max(0.2, Math.min(0.86, c.sideA.cardImageRatio));
    const cardTitleMaxFont = slot.isNarrow ? c.sideA.narrowCardTitleMaxFont : c.sideA.cardTitleMaxFont;
    const cardDescMaxFont = slot.isNarrow ? c.sideA.narrowCardDescMaxFont : c.sideA.cardDescMaxFont;
    const cardButtonW = slot.isNarrow ? c.sideA.narrowCardButtonW : c.sideA.cardButtonW;
    const cardButtonH = slot.isNarrow ? c.sideA.narrowCardButtonH : c.sideA.cardButtonH;
    const cardButtonFont = slot.isNarrow ? c.sideA.narrowCardButtonFont : c.sideA.cardButtonFont;
    const cardButtonArrowW = slot.isNarrow ? c.sideA.narrowCardButtonArrowW : c.sideA.cardButtonArrowW;
    const mediaGridStyle = {
      '--coming-card-gap': `${c.sideA.cardGap / 16}rem`,
      '--coming-card-min-w': `${c.sideA.cardMinW / 16}rem`,
      '--coming-card-pad': `${c.sideA.cardPad / 16}rem`,
      '--coming-card-radius': `${c.sideA.cardRadius / 16}rem`,
      '--coming-card-copy-pad': `${c.sideA.cardCopyPad / 16}rem`,
      '--coming-card-title-font': `${cardTitleMaxFont / 16}rem`,
      '--coming-card-desc-font': `${cardDescMaxFont / 16}rem`,
      '--coming-card-button-w': `${cardButtonW / 16}rem`,
      '--coming-card-button-h': `${cardButtonH / 16}rem`,
      '--coming-card-button-font': `${cardButtonFont / 16}rem`,
      '--coming-card-button-arrow-w': `${cardButtonArrowW / 16}rem`,
      '--coming-card-button-align': normalizeButtonAlign(c.sideA.cardButtonAlign),
      '--coming-card-button-bottom': `${c.sideA.cardButtonBottom / 16}rem`,
    } as CSSProperties;
    return (
      <foreignObject x={slot.x} y={slot.y} width={slot.width} height={slot.height}>
        <div className="coming-soon-showcase__media-grid" style={mediaGridStyle}>
          {cards.map((game) => (
            <button
              key={`${game.gameId}:${String(game.guid ?? game.gameId)}`}
              type="button"
              className={`coming-soon-showcase__media-card ${game.gameId === slot.game.gameId ? 'is-active' : ''}`}
              onClick={() => onGameClick?.(`${game.gameId}:${String(game.guid ?? game.gameId)}`)}
              style={{
                gridTemplateRows: `minmax(0, ${Math.round(imageRatio * 100)}%) minmax(0, ${Math.round((1 - imageRatio) * 100)}%)`,
              }}
            >
              <span className="coming-soon-showcase__media-image">
                {renderCardImage(game.bannerImage, game.name, resolveImageUrl)}
              </span>
              <span className="coming-soon-showcase__media-copy">
                <strong>{game.name}</strong>
                <small>{getDescription(game)}</small>
                <span className="coming-soon-showcase__media-action">
                  <span>Learn More</span>
                  <i aria-hidden="true" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </foreignObject>
    );
  };

  const renderSideB = (slot: FeaturedShowcaseSideBSlot) => {
    const rows = Math.max(1, Math.round(c.sideB.montageRows));
    const columns = Math.max(1, Math.round(c.sideB.montageColumns));
    const montageH = slot.isNarrow ? c.sideB.narrowMontageH : c.sideB.montageH;
    const catalogEyebrowFont = slot.isNarrow ? c.sideB.narrowCatalogEyebrowFont : c.sideB.catalogEyebrowFont;
    const catalogTitleFont = slot.isNarrow ? c.sideB.narrowCatalogTitleFont : c.sideB.catalogTitleFont;
    const catalogDescFont = slot.isNarrow ? c.sideB.narrowCatalogDescFont : c.sideB.catalogDescFont;
    const catalogButtonW = slot.isNarrow ? c.sideB.narrowCatalogButtonW : c.sideB.catalogButtonW;
    const catalogButtonH = slot.isNarrow ? c.sideB.narrowCatalogButtonH : c.sideB.catalogButtonH;
    const catalogButtonFont = slot.isNarrow ? c.sideB.narrowCatalogButtonFont : c.sideB.catalogButtonFont;
    const catalogButtonArrowW = slot.isNarrow ? c.sideB.narrowCatalogButtonArrowW : c.sideB.catalogButtonArrowW;
    const montageGames = (catalogMontageGames.length > 0
      ? catalogMontageGames
      : [...availableNow, ...comingSoonGames]
    );
    const montageLanes = Array.from({ length: rows }, (_, rowIndex) => {
      if (montageGames.length === 0) return [];
      const rotated = montageGames.map((_, index) => montageGames[(index + rowIndex * columns) % montageGames.length]);
      return [...rotated, ...rotated];
    });
    const catalogStyle = {
      '--catalog-montage-rows': rows,
      '--catalog-montage-columns': columns,
      '--catalog-montage-gap': `${c.sideB.montageGap / 16}rem`,
      '--catalog-montage-height': `${montageH / 16}rem`,
      '--catalog-tile-width': `calc((100% - ${((columns - 1) * c.sideB.montageGap) / 16}rem) / ${columns})`,
      '--catalog-image-radius': `${c.sideB.montageImageRadius / 16}rem`,
      '--catalog-image-fit': c.sideB.montageImageFit === 'stretch' ? 'fill' : 'cover',
      '--catalog-image-blur': `${c.sideB.montageImageBlur}px`,
      '--catalog-image-outline-width': `${c.sideB.montageImageOutlineWidth}px`,
      '--catalog-image-outline-opacity': c.sideB.montageImageOutlineOpacity,
      '--catalog-slide-duration': `${c.sideB.montageSlideDuration}s`,
      '--catalog-panel-pad-x': `${c.sideB.catalogPanelPadX / 16}rem`,
      '--catalog-panel-pad-y': `${c.sideB.catalogPanelPadY / 16}rem`,
      '--catalog-copy-gap': `${c.sideB.catalogCopyGap / 16}rem`,
      '--catalog-copy-offset-y': `${c.sideB.catalogCopyOffsetY / 16}rem`,
      '--catalog-eyebrow-font': `${catalogEyebrowFont / 16}rem`,
      '--catalog-eyebrow-gap': `${c.sideB.catalogEyebrowGap / 16}rem`,
      '--catalog-title-font': `${catalogTitleFont / 16}rem`,
      '--catalog-title-gap': `${c.sideB.catalogTitleGap / 16}rem`,
      '--catalog-desc-font': `${catalogDescFont / 16}rem`,
      '--catalog-button-w': `${catalogButtonW / 16}rem`,
      '--catalog-button-h': `${catalogButtonH / 16}rem`,
      '--catalog-button-font': `${catalogButtonFont / 16}rem`,
      '--catalog-button-arrow-w': `${catalogButtonArrowW / 16}rem`,
      '--catalog-button-align': normalizeButtonAlign(c.sideB.catalogButtonAlign),
    } as CSSProperties;

    return (
      <foreignObject x={slot.x} y={slot.y} width={slot.width} height={slot.height}>
        <div className="coming-soon-showcase__catalog-panel" style={catalogStyle}>
          <div className="coming-soon-showcase__catalog-montage">
            {montageLanes.length > 0 && montageLanes[0].length > 0 ? (
              montageLanes.map((lane, rowIndex) => (
                <div
                  key={`catalog-row-${rowIndex}`}
                  className={`coming-soon-showcase__catalog-row ${rowIndex % 2 === 0 ? 'coming-soon-showcase__catalog-row--forward' : 'coming-soon-showcase__catalog-row--reverse'}`}
                >
                  <div className="coming-soon-showcase__catalog-row-track">
                    {lane.map((game, index) => (
                      <span
                        key={`${game.gameId}:${String(game.guid ?? game.gameId)}:${rowIndex}:${index}`}
                        className="coming-soon-showcase__catalog-tile"
                      >
                        {renderCardImage(game.bannerImage, game.name, resolveImageUrl)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <span className="coming-soon-showcase__image-fallback">1000+</span>
            )}
          </div>
          <div className="coming-soon-showcase__catalog-copy">
            <p>Catalog</p>
            <h3>1000+ Games</h3>
            <span>Browse classic, social, tactical, and experimental games as the catalog grows.</span>
          </div>
          {showExploreTile ? (
            <button type="button" className="coming-soon-showcase__catalog-button" onClick={onExploreClick}>
              <span>Explore Catalog</span>
              <i aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </foreignObject>
    );
  };

  return (
    <FeaturedGameShowcase
      className="coming-soon-showcase"
      featured={comingSoonGames}
      recommended={availableNow}
      featuredLabel="Coming Soon"
      recommendedLabel="Available Now"
      isLoading={isLoading}
      controls={controls}
      onLearnMore={onGameClick}
      resolveImageUrl={resolveImageUrl}
      renderMedia={renderMedia}
      renderSideB={renderSideB}
      allowDebugBounds={allowDebugBounds}
      previewLayoutMode={previewLayoutMode}
      showBadges={false}
      showLearnMore={false}
    />
  );
}
