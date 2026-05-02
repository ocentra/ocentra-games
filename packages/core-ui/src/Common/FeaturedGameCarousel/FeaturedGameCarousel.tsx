import React, { Component } from 'react';
import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import type { FeaturedGameItem } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { GameBadgesOverlay } from '../GameBadgesOverlay/GameBadgesOverlay';
import { CarouselImage } from '../CarouselImage/CarouselImage';
import { GameBannerImage } from '../GameBannerImage/GameBannerImage';
import { getBannerPlaybackImageCount, getBannerPlaybackImages } from './bannerPlayback';
import './FeaturedGameCarousel.css';

const TabType = { Featured: 'featured', Recommended: 'recommended' } as const;
type TabType = (typeof TabType)[keyof typeof TabType];

interface FeaturedGameCarouselProps {
  featured: FeaturedGameItem[];
  recommended?: FeaturedGameItem[];
  games?: FeaturedGameItem[];
  isLoading?: boolean;
  onLearnMore?: (gameIdentifier: string) => void;
  resolveImageUrl: (hash: ImageHash) => string | null;
  solanaImgSrc?: string;
  debugLayout?: boolean;
}

interface FeaturedGameCarouselState {
  activeTab: TabType;
  currentSlide: number;
  prevSlide: number;
  currentImageIndex: number;
  prevImageIndex: number | null;
  isTransitioning: boolean;
  direction: 'left' | 'right';
}

export type FeaturedBannerComposition = Pick<FeaturedGameItem,
  'carouselPlaybackMode' |
  'carouselTransitionType' |
  'carouselTransitionDurationMs' |
  'bannerLogoImage' |
  'bannerLogoAlt' |
  'bannerLogoStartMs' |
  'bannerLogoDurationMs' |
  'bannerLogoScaleFrom' |
  'bannerLogoScaleTo' |
  'bannerLogoOpacityFrom' |
  'bannerLogoOpacityTo' |
  'bannerLogoVisibleFromIndex' |
  'bannerLogoVisibleToIndex' |
  'bannerTitleText' |
  'bannerTitleColor' |
  'bannerTitleStartMs' |
  'bannerTitleDurationMs' |
  'bannerTitleScaleFrom' |
  'bannerTitleScaleTo' |
  'bannerTitleOpacityFrom' |
  'bannerTitleOpacityTo' |
  'bannerTitleVisibleFromIndex' |
  'bannerTitleVisibleToIndex' |
  'bannerOverlayTintColor' |
  'bannerOverlayTintOpacity' |
  'bannerVignetteOpacity' |
  'bannerFadeToBlackOpacity'
> & {
  gameId: string;
  name: string;
};

export interface FeaturedGameBannerStageProps {
  game: FeaturedBannerComposition;
  images: ImageHash[];
  currentImageIndex: number;
  prevImageIndex: number | null;
  resolveImageUrl: (hash: ImageHash) => string | null;
  className?: string;
  emptyMessage?: string;
  children?: React.ReactNode;
}

function getCarouselTransitionClass(game: FeaturedBannerComposition): string {
  switch (game.carouselTransitionType) {
    case 'swipe':
      return 'featured-carousel-transition-swipe';
    case 'cut':
      return 'featured-carousel-transition-cut';
    default:
      return 'featured-carousel-transition-cross-dissolve';
  }
}

function getCompositionStyle(game: FeaturedBannerComposition): React.CSSProperties {
  return {
    '--featured-banner-transition-duration': `${game.carouselTransitionDurationMs ?? 1500}ms`,
    '--featured-banner-overlay-color': game.bannerOverlayTintColor ?? 'transparent',
    '--featured-banner-overlay-opacity': String(game.bannerOverlayTintOpacity ?? 0),
    '--featured-banner-vignette-opacity': String(game.bannerVignetteOpacity ?? 0),
    '--featured-banner-fade-opacity': String(game.bannerFadeToBlackOpacity ?? 0),
    '--featured-banner-logo-delay': `${game.bannerLogoStartMs ?? 0}ms`,
    '--featured-banner-logo-duration': `${game.bannerLogoDurationMs ?? 1600}ms`,
    '--featured-banner-logo-scale-from': String(game.bannerLogoScaleFrom ?? 1),
    '--featured-banner-logo-scale-to': String(game.bannerLogoScaleTo ?? 1),
    '--featured-banner-logo-opacity-from': String(game.bannerLogoOpacityFrom ?? 1),
    '--featured-banner-logo-opacity-to': String(game.bannerLogoOpacityTo ?? 1),
    '--featured-banner-title-color': game.bannerTitleColor ?? 'rgba(255, 255, 255, 0.96)',
    '--featured-banner-title-delay': `${game.bannerTitleStartMs ?? game.bannerLogoStartMs ?? 0}ms`,
    '--featured-banner-title-duration': `${game.bannerTitleDurationMs ?? game.bannerLogoDurationMs ?? 1600}ms`,
    '--featured-banner-title-scale-from': String(game.bannerTitleScaleFrom ?? game.bannerLogoScaleFrom ?? 1),
    '--featured-banner-title-scale-to': String(game.bannerTitleScaleTo ?? game.bannerLogoScaleTo ?? 1),
    '--featured-banner-title-opacity-from': String(game.bannerTitleOpacityFrom ?? game.bannerLogoOpacityFrom ?? 1),
    '--featured-banner-title-opacity-to': String(game.bannerTitleOpacityTo ?? game.bannerLogoOpacityTo ?? 1),
  } as React.CSSProperties;
}

function hasBannerComposition(game: FeaturedBannerComposition): boolean {
  return !!game.bannerLogoImage ||
    !!game.bannerTitleText ||
    (game.bannerOverlayTintOpacity ?? 0) > 0 ||
    (game.bannerVignetteOpacity ?? 0) > 0 ||
    (game.bannerFadeToBlackOpacity ?? 0) > 0;
}

function hasFrameVisibility(from?: number, to?: number): boolean {
  return typeof from === 'number' || typeof to === 'number';
}

function isFrameVisible(index: number, from?: number, to?: number): boolean {
  if (!hasFrameVisibility(from, to)) return true;
  const start = from ?? 0;
  const end = to ?? Number.MAX_SAFE_INTEGER;
  return start <= end
    ? index >= start && index <= end
    : index >= start || index <= end;
}

function getPlayerDisplay(game: FeaturedGameItem): string | undefined {
  if (game.playersDisplay) return game.playersDisplay;
  if (typeof game.minPlayers !== 'number' && typeof game.maxPlayers !== 'number') return undefined;
  if (game.minPlayers === game.maxPlayers && typeof game.minPlayers === 'number') return `${game.minPlayers} Players`;
  if (typeof game.minPlayers === 'number' && typeof game.maxPlayers === 'number') return `${game.minPlayers}-${game.maxPlayers} Players`;
  if (typeof game.maxPlayers === 'number') return `Up to ${game.maxPlayers} Players`;
  return undefined;
}

function formatDataLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function getFeatureRows(game: FeaturedGameItem): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const playerDisplay = getPlayerDisplay(game);
  if (playerDisplay) rows.push({ label: 'Players', value: playerDisplay });
  if (game.duration) rows.push({ label: 'Duration', value: game.duration });
  if (game.deck) rows.push({ label: 'Deck', value: game.deck });
  if (game.difficulty) rows.push({ label: 'Difficulty', value: game.difficulty });
  if (game.releaseStatus) rows.push({ label: 'Status', value: formatDataLabel(String(game.releaseStatus)) });
  return rows.slice(0, 2);
}

function getTimelineClass(isTimeline: boolean, visible: boolean): string {
  if (!isTimeline) return '';
  return visible
    ? ' featured-game-composition-timeline featured-game-composition-timeline-visible'
    : ' featured-game-composition-timeline featured-game-composition-timeline-hidden';
}

export const FeaturedGameBannerStage: React.FC<FeaturedGameBannerStageProps> = ({
  game,
  images,
  currentImageIndex,
  prevImageIndex,
  resolveImageUrl,
  className,
  emptyMessage,
  children,
}) => {
  const transitionClass = getCarouselTransitionClass(game);
  const bannerCompositionStyle = getCompositionStyle(game);
  const playbackImages = getBannerPlaybackImages(images, game.carouselPlaybackMode);
  const activeImageIndex = playbackImages.length > 0
    ? Math.min(currentImageIndex, playbackImages.length - 1)
    : 0;
  const previousImageIndex = prevImageIndex !== null && prevImageIndex < playbackImages.length
    ? prevImageIndex
    : null;
  const imageEntries = playbackImages.map((img, displayIndex) => ({ img, displayIndex }));
  const logoUsesFrameVisibility = hasFrameVisibility(
    game.bannerLogoVisibleFromIndex,
    game.bannerLogoVisibleToIndex,
  );
  const logoFrameVisible = isFrameVisible(
    activeImageIndex,
    game.bannerLogoVisibleFromIndex,
    game.bannerLogoVisibleToIndex,
  );
  const titleUsesFrameVisibility = hasFrameVisibility(
    game.bannerTitleVisibleFromIndex,
    game.bannerTitleVisibleToIndex,
  );
  const titleFrameVisible = isFrameVisible(
    activeImageIndex,
    game.bannerTitleVisibleFromIndex,
    game.bannerTitleVisibleToIndex,
  );

  return (
    <div className={`featured-game-image ${transitionClass} ${className ?? ''}`} style={bannerCompositionStyle}>
      {playbackImages.length === 0 ? (
        <div className="featured-game-banner-loading">{emptyMessage ?? `No images available for ${game.name}`}</div>
      ) : (
        <div className="featured-game-image-animated-wrapper">
          {previousImageIndex !== null && previousImageIndex !== activeImageIndex ? (() => {
            const priorImage = playbackImages[previousImageIndex];
            return priorImage ? (
              <CarouselImage
                key={`${game.gameId}-${previousImageIndex}-hold`}
                src={priorImage}
                alt={game.name}
                className="featured-game-banner hold-active"
                resolveImageUrl={resolveImageUrl}
              />
            ) : null;
          })() : null}
          {imageEntries.map(({ img, displayIndex }) => {
            const imgActive = displayIndex === activeImageIndex;
            const imgWasActive = displayIndex === previousImageIndex;

            return (
              <CarouselImage
                key={`${game.gameId}-${displayIndex}`}
                src={img}
                alt={game.name}
                className={`featured-game-banner ${imgActive ? 'active' : ''} ${imgWasActive ? 'was-active' : ''}`}
                resolveImageUrl={resolveImageUrl}
              />
            );
          })}
        </div>
      )}

      {hasBannerComposition(game) && (
        <div className="featured-game-composition-overlays">
          <div className="featured-game-composition-layer featured-game-overlay-tint" />
          <div className="featured-game-composition-layer featured-game-overlay-vignette" />
          <div className="featured-game-composition-layer featured-game-overlay-fade" />
          {game.bannerLogoImage ? (
            <GameBannerImage
              src={game.bannerLogoImage as ImageHash}
              alt={game.bannerLogoAlt ?? game.name}
              className={`featured-game-logo-overlay${getTimelineClass(logoUsesFrameVisibility, logoFrameVisible)}`}
              resolveImageUrl={resolveImageUrl}
            />
          ) : game.bannerTitleText ? (
            <div className={`featured-game-title-overlay${getTimelineClass(titleUsesFrameVisibility, titleFrameVisible)}`}>
              {game.bannerTitleText}
            </div>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
};

export class FeaturedGameCarousel extends Component<FeaturedGameCarouselProps, FeaturedGameCarouselState> {
  private behaviour: ReactBehaviour<FeaturedGameCarouselProps>;
  private imageInterval: ReturnType<typeof setInterval> | null = null;

  constructor(props: FeaturedGameCarouselProps) {
    super(props);

    this.state = {
      activeTab: TabType.Featured,
      currentSlide: 0,
      prevSlide: 0,
      currentImageIndex: 0,
      prevImageIndex: null,
      isTransitioning: false,
      direction: 'right',
    };

    this.behaviour = new (class extends ReactBehaviour<FeaturedGameCarouselProps> {
      private component: FeaturedGameCarousel;

      constructor(context: FeaturedGameCarouselProps | undefined, component: FeaturedGameCarousel) {
        super(context);
        this.component = component;
      }

      protected override awake(): void {}

      protected override async onStart(): Promise<void> {}

      protected override onDestroy(): void {
        if (this.component.imageInterval) {
          clearInterval(this.component.imageInterval);
          this.component.imageInterval = null;
        }
      }
    })(props, this);
  }

  override componentDidMount(): void {
    this.behaviour.__initialize();
    this.behaviour.start();
    this.setupImageRotation();
  }

  override componentDidUpdate(prevProps: FeaturedGameCarouselProps, prevState: FeaturedGameCarouselState): void {
    if (prevState.activeTab !== this.state.activeTab) {
      this.setupImageRotation('TabChange');
      return;
    }

    if (prevState.currentSlide !== this.state.currentSlide) {
      this.setState({ currentImageIndex: 0, prevImageIndex: null }, () => {
        this.setupImageRotation('SlideChange');
      });
      return;
    }

    const curr = this.getCurrentGames();
    const prev = this.getGamesForTab(prevProps, prevState.activeTab);
    if (prev.length !== curr.length ||
      JSON.stringify(prev.map(g => g.guid)) !== JSON.stringify(curr.map(g => g.guid))) {
      this.setupImageRotation('GamesPropsChange');
    }

    if (prevState.currentImageIndex !== this.state.currentImageIndex) {
      this.setupImageRotation('ImageIndexChange');
    }
  }

  override componentWillUnmount(): void {
    this.behaviour.destroy();
    this.clearImageTimeout();
  }

  private clearImageTimeout(): void {
    if (this.imageInterval) {
      clearTimeout(this.imageInterval);
      this.imageInterval = null;
    }
  }

  private getFeatured(): FeaturedGameItem[] {
    const arr = this.props.featured ?? this.props.games ?? [];
    return arr.filter((game) => game.enabled);
  }

  private getRecommended(): FeaturedGameItem[] {
    return (this.props.recommended ?? []).filter((game) => game.enabled);
  }

  private getGamesForTab(props: FeaturedGameCarouselProps, tab: TabType): FeaturedGameItem[] {
    return tab === TabType.Featured
      ? (props.featured ?? props.games ?? []).filter((g) => g.enabled)
      : (props.recommended ?? []).filter((g) => g.enabled);
  }

  private getCurrentGames(): FeaturedGameItem[] {
    return this.state.activeTab === TabType.Featured ? this.getFeatured() : this.getRecommended();
  }

  private getGameImages(gameId: string): ImageHash[] {
    const all = [...this.getFeatured(), ...this.getRecommended()];
    const game = all.find(g => g.gameId === gameId);
    if (!game) return [];

    if (game.carouselImages && game.carouselImages.length > 0) {
      return game.carouselImages as ImageHash[];
    } else if (game.bannerImage) {
      return [game.bannerImage as ImageHash];
    }
    return [];
  }

  private setupImageRotation(_reason: string = 'Auto'): void {
    this.clearImageTimeout();

    const currentGames = this.getCurrentGames();
    const currentGame = currentGames[this.state.currentSlide];
    if (!currentGame) return;

    const currentGameImages = this.getGameImages(currentGame.gameId);
    const imageCount = getBannerPlaybackImageCount(currentGameImages.length, currentGame.carouselPlaybackMode);
    if (imageCount <= 1) return;

    const maxIndex = imageCount - 1;
    let duration: number;

    const lastImageDuration = currentGame.carouselLastImageDurationMs ?? 5000;
    const fastRotationDuration = currentGame.carouselFastRotationDurationMs ?? 1500;
    const defaultRotationDuration = currentGame.carouselDefaultRotationDurationMs ?? 3500;
    const fastRotationThreshold = currentGame.carouselFastRotationThreshold ?? 4;

    if (this.state.currentImageIndex === maxIndex) {
      duration = lastImageDuration;
    } else if (this.state.currentImageIndex >= fastRotationThreshold) {
      duration = fastRotationDuration;
    } else {
      duration = defaultRotationDuration;
    }

    this.imageInterval = setTimeout(() => {
      this.rotateToNextImage();
    }, duration);
  }

  private rotateToNextImage(): void {
    const currentGames = this.getCurrentGames();
    const currentGame = currentGames[this.state.currentSlide];
    if (!currentGame) return;

    const gameImages = this.getGameImages(currentGame.gameId);
    const imageCount = getBannerPlaybackImageCount(gameImages.length, currentGame.carouselPlaybackMode);
    if (imageCount === 0) return;

    this.setState((prevState) => {
      const nextImageIndex = (prevState.currentImageIndex + 1) % imageCount;

      if (nextImageIndex === 0 && currentGames.length > 1) {
        const slideTransitionDelay = currentGame?.carouselSlideTransitionDelayMs;
        if (slideTransitionDelay !== undefined) {
          setTimeout(() => {
            this.goToSlide((prevState.currentSlide + 1) % currentGames.length, 'right');
          }, slideTransitionDelay);
        }
      }

      return {
        currentImageIndex: nextImageIndex,
        prevImageIndex: prevState.currentImageIndex
      };
    });
  }

  private goToSlide = (newSlide: number, dir: 'left' | 'right'): void => {
    if (this.state.isTransitioning || newSlide === this.state.currentSlide) return;

    this.setState({
      direction: dir,
      prevSlide: this.state.currentSlide,
      isTransitioning: true,
      currentSlide: newSlide,
    });

    setTimeout(() => {
      this.setState({ isTransitioning: false });
    }, 600);
  };

  private handlePrev = (): void => {
    const currentGames = this.getCurrentGames();
    const newSlide = this.state.currentSlide > 0 ? this.state.currentSlide - 1 : currentGames.length - 1;
    this.goToSlide(newSlide, 'left');
  };

  private handleNext = (): void => {
    const currentGames = this.getCurrentGames();
    const newSlide = this.state.currentSlide < currentGames.length - 1 ? this.state.currentSlide + 1 : 0;
    this.goToSlide(newSlide, 'right');
  };

  private handleIndicatorClick = (index: number): void => {
    const dir = index > this.state.currentSlide ? 'right' : 'left';
    this.goToSlide(index, dir);
  };

  private handleTabChange = (tab: TabType): void => {
    this.setState({
      activeTab: tab,
      currentSlide: 0,
      prevSlide: 0,
      currentImageIndex: 0,
      prevImageIndex: null,
    });
  };

  override render(): React.ReactElement {
    const featuredGames = this.getFeatured();
    const recommendedGames = this.getRecommended();
    const slides = this.getCurrentGames();

    if (this.props.isLoading && featuredGames.length === 0 && recommendedGames.length === 0) {
      return (
        <div className="featured-carousel">
          <div className="carousel-container">
            <p>Loading games...</p>
          </div>
        </div>
      );
    }

    if (featuredGames.length === 0 && recommendedGames.length === 0) {
      return (
        <div className="featured-carousel">
          <div className="carousel-container">
            <p>No featured or recommended games available</p>
          </div>
        </div>
      );
    }

    const { resolveImageUrl, debugLayout } = this.props;

    return (
      <div className="featured-carousel">
        <button
          className={`carousel-nav-button carousel-nav-prev ${slides.length <= 1 ? 'hidden' : ''}`}
          onClick={this.handlePrev}
          aria-label="Previous game"
          disabled={slides.length <= 1}
        >
          ◀
        </button>
        <button
          className={`carousel-nav-button carousel-nav-next ${slides.length <= 1 ? 'hidden' : ''}`}
          onClick={this.handleNext}
          aria-label="Next game"
          disabled={slides.length <= 1}
        >
          ▶
        </button>

        <div className="carousel-container">
          <div className="featured-carousel-tabs">
            <button
              className={`carousel-tab ${this.state.activeTab === TabType.Featured ? 'active' : ''}`}
              onClick={() => this.handleTabChange(TabType.Featured)}
              type="button"
            >
              <span className="tab-label">
                <span className="tab-first-letter">F</span>EATURED
              </span>
              {featuredGames.length > 0 && (
                <span className="tab-count">({featuredGames.length})</span>
              )}
            </button>
            <button
              className={`carousel-tab ${this.state.activeTab === TabType.Recommended ? 'active' : ''}`}
              onClick={() => this.handleTabChange(TabType.Recommended)}
              type="button"
            >
              <span className="tab-label">
                <span className="tab-first-letter">R</span>ECOMMENDED
              </span>
              {recommendedGames.length > 0 && (
                <span className="tab-count">({recommendedGames.length})</span>
              )}
            </button>
          </div>

          <div className="featured-game-display-wrapper">
            {slides.length > 0 ? slides.map((game: FeaturedGameItem, slideIndex: number) => {
              const isActive = slideIndex === this.state.currentSlide;
              const wasActive = slideIndex === this.state.prevSlide;
              const isEntering = this.state.isTransitioning && isActive;
              const isExiting = this.state.isTransitioning && wasActive && !isActive;
              const gameImagesList = this.getGameImages(game.gameId);

              return (
                <div
                  key={`${game.gameId}:${game.guid}`}
                  className={`featured-game-display ${isActive ? 'active' : ''} ${isExiting ? `exiting-${this.state.direction}` : ''} ${isEntering ? `entering-${this.state.direction}` : ''} ${debugLayout ? 'featured-debug-slide' : ''}`}
                >
                  <div className="featured-game-display-inner">
                  {debugLayout ? (
                    <>
                      <div className="featured-debug-image">Image</div>
                      <div className="featured-debug-details">Details</div>
                    </>
                  ) : (
                  <>
                  <div className="featured-game-left">
                    <FeaturedGameBannerStage
                      game={game}
                      images={gameImagesList}
                      currentImageIndex={this.state.currentImageIndex}
                      prevImageIndex={this.state.prevImageIndex}
                      resolveImageUrl={resolveImageUrl}
                    >
                      <div className="featured-tags-overlay">
                        {(game.tags ?? []).slice(0, 6).map((tag) => (
                          <span key={tag} className="featured-tag-overlay">{tag}</span>
                        ))}
                      </div>

                      <GameBadgesOverlay
                        availableNow={!game.comingSoon}
                        trailingContent={this.props.onLearnMore ? (
                          <button
                            className="featured-learn-more-button"
                            onClick={() => {
                              const gameIdentifier = `${game.gameId}:${String(game.guid)}`;
                              this.props.onLearnMore?.(gameIdentifier);
                            }}
                          >
                            Learn More →
                          </button>
                        ) : undefined}
                      />
                    </FeaturedGameBannerStage>
                  </div>

                  <div className="featured-game-right">
                    <div className="featured-game-details">
                      <div className="featured-game-content">
                        <div className="featured-game-header">
                          {game.textImageUrl ? (
                            <>
                              <GameBannerImage
                                src={game.textImageUrl as ImageHash}
                                alt={game.name}
                                className="featured-claim-text-image"
                                resolveImageUrl={resolveImageUrl}
                              />
                              {game.tagline && (
                                <h2 className="featured-game-subtitle">{game.tagline}</h2>
                              )}
                              {game.tagline2 && (
                                <h4 className="featured-game-tagline">{game.tagline2}</h4>
                              )}
                            </>
                          ) : (
                            <>
                              <h2 className="featured-game-title">{game.name}</h2>
                              {game.tagline && (
                                <h2 className="featured-game-subtitle">{game.tagline}</h2>
                              )}
                              {game.tagline2 && (
                                <h4 className="featured-game-tagline">{game.tagline2}</h4>
                              )}
                            </>
                          )}
                        </div>

                        <p className="featured-game-description">
                          {game.description || game.shortDescription || ''}
                        </p>

                        <div className="featured-features">
                          {getFeatureRows(game).map((row) => (
                            <div key={row.label} className="feature-item">
                              <span className="feature-text">
                                <span className="feature-label">{row.label}</span>
                                <span className="badge badge-coming-soon">{row.value}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  </>
                  )}
                  </div>
                </div>
              );
            }) : (
              <div className="featured-empty-state">
                <p className="featured-empty-message">
                  {this.state.activeTab === TabType.Featured
                    ? 'No featured games available'
                    : 'No recommended games available'}
                </p>
              </div>
            )}
          </div>

          {slides.length > 1 && (
            <div className="carousel-bottom-controls">
              <div className="carousel-indicators">
                {slides.map((_: FeaturedGameItem, index: number) => (
                  <button
                    key={index}
                    className={`carousel-indicator ${index === this.state.currentSlide ? 'active' : ''}`}
                    onClick={() => this.handleIndicatorClick(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
