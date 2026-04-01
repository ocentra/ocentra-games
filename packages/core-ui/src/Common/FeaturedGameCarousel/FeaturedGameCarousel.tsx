import React, { Component } from 'react';
import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import type { FeaturedGameItem } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { GameBadgesOverlay } from '../GameBadgesOverlay/GameBadgesOverlay';
import { CarouselImage } from '../CarouselImage/CarouselImage';
import { GameBannerImage } from '../GameBannerImage/GameBannerImage';
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

export class FeaturedGameCarousel extends Component<FeaturedGameCarouselProps, FeaturedGameCarouselState> {
  private behaviour: ReactBehaviour<FeaturedGameCarouselProps>;
  private imageInterval: NodeJS.Timeout | null = null;

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
    if (currentGameImages.length <= 1) return;

    const maxIndex = currentGameImages.length - 1;
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
    if (gameImages.length === 0) return;

    this.setState((prevState) => {
      const nextImageIndex = (prevState.currentImageIndex + 1) % gameImages.length;

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

    const { resolveImageUrl, solanaImgSrc, debugLayout } = this.props;

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
                    <div className="featured-game-image">
                      {gameImagesList.length === 0 ? (
                        <div className="featured-game-banner-loading">No images available for {game.name}</div>
                      ) : (
                        <div className="featured-game-image-animated-wrapper">
                          {gameImagesList.map((img: ImageHash, displayIndex: number) => {
                            const imgActive = displayIndex === this.state.currentImageIndex;
                            const imgWasActive = displayIndex === this.state.prevImageIndex;

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

                      <div className="featured-tags-overlay">
                        {game.tags?.includes('Card Game') && (
                          <span className="featured-tag-overlay">Card Game</span>
                        )}
                        {game.tags?.includes('Strategy') && (
                          <span className="featured-tag-overlay">Strategy</span>
                        )}
                        {game.tags?.includes('Multiplayer') ? (
                          <>
                            <span className="featured-tag-overlay">Single player</span>
                            <span className="featured-tag-overlay">Multiplayer</span>
                          </>
                        ) : (
                          <span className="featured-tag-overlay">Single player</span>
                        )}
                        <span className="featured-tag-overlay">Players Vs AI</span>
                        <span className="featured-tag-overlay">AI Vs AI</span>
                      </div>

                      <GameBadgesOverlay
                        availableNow={!game.comingSoon}
                        freeToPlay={!game.comingSoon}
                        solanaVerified={!!solanaImgSrc}
                        solanaImgSrc={solanaImgSrc}
                        aiBenchmark={true}
                        leaderboard={true}
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
                    </div>
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
                          {game.description || 'Experience this exciting multiplayer game.'}
                        </p>

                        <div className="featured-features">
                          <div className="feature-item">
                            <span className="feature-text">
                              <span className="feature-label">Money Matches</span>
                              <span className="badge badge-coming-soon">Coming Soon</span>
                            </span>
                          </div>
                          <div className="feature-item">
                            <span className="feature-text">
                              <span className="feature-label">Tournaments</span>
                              <span className="badge badge-coming-soon">Coming Soon</span>
                            </span>
                          </div>
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
