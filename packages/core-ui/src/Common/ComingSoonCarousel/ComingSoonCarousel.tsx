import React, { Component } from 'react';
import { getPlaceholderImageUrl, placeholderImageCount } from '@ocentra/app-assets/placeholders';
import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import type { FeaturedGameItem } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type { ComingSoonItem } from '@ocentra/game-asset-domain/schemas/coming-soon-teaser-schema';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { ExploreGameSummary } from '../types/ExploreGameSummary';
import { GameBannerImage } from '../GameBannerImage/GameBannerImage';
import { ExploreGamesPanel } from '../ExploreGamesPanel/ExploreGamesPanel';
import './ComingSoonCarousel.css';

const AUTOPLAY_INTERVAL_MS = 4500;

function getStablePlaceholder(slugOrName: string): string {
  let hash = 0;
  for (let i = 0; i < slugOrName.length; i++) {
    hash = (hash * 31 + slugOrName.charCodeAt(i)) >>> 0;
  }
  return getPlaceholderImageUrl(hash % placeholderImageCount);
}

const TabType = {
  ComingSoon: 'coming-soon',
  AvailableNow: 'available-now',
  Explore: 'explore',
} as const;

type TabType = typeof TabType[keyof typeof TabType];

export interface ComingSoonCarouselProps {
  comingSoon: ComingSoonItem[];
  availableNow: FeaturedGameItem[];
  explorerGames?: ExploreGameSummary[];
  isLoading?: boolean;
  onGameClick?: (gameIdentifier: string) => void;
  onExploreClick?: () => void;
  resolveImageUrl: (hash: ImageHash) => string | null;
  showExploreTab?: boolean;
  showExploreTile?: boolean;
}

interface ComingSoonCarouselState {
  activeTab: TabType;
  currentIndex: number;
  isAutoPlaying: boolean;
  sequenceIndex: number;
}

export class ComingSoonCarousel extends Component<ComingSoonCarouselProps, ComingSoonCarouselState> {
  private behaviour: ReactBehaviour<ComingSoonCarouselProps>;
  private trackRef = React.createRef<HTMLDivElement>();
  private slideRef = React.createRef<HTMLDivElement>();
  private autoPlayInterval: NodeJS.Timeout | null = null;

  constructor(props: ComingSoonCarouselProps) {
    super(props);

    this.state = {
      activeTab: TabType.ComingSoon,
      currentIndex: 0,
      isAutoPlaying: true,
      sequenceIndex: 0,
    };

    this.behaviour = new (class extends ReactBehaviour<ComingSoonCarouselProps> {
      private component: ComingSoonCarousel;

      constructor(context: ComingSoonCarouselProps | undefined, component: ComingSoonCarousel) {
        super(context);
        this.component = component;
      }

      protected override awake(): void {}

      protected override async onStart(): Promise<void> {}

      protected override onDestroy(): void {
        if (this.component.autoPlayInterval) {
          clearInterval(this.component.autoPlayInterval);
          this.component.autoPlayInterval = null;
        }
      }
    })(props, this);
  }

  override componentDidMount(): void {
    this.behaviour.__initialize();
    this.behaviour.start();
    this.setupAutoPlay();
  }

  override componentDidUpdate(): void {
    if (
      this.state.activeTab === TabType.ComingSoon &&
      this.props.isLoading &&
      this.props.comingSoon.length === 0 &&
      this.props.availableNow.length > 0
    ) {
      this.setState(
        {
          activeTab: TabType.AvailableNow,
          currentIndex: 0,
          sequenceIndex: 0,
        },
        () => this.setupAutoPlay()
      );
      return;
    }

    if (this.state.activeTab === TabType.Explore) return;
    if (this.slideRef.current) {
      const currentGames = this.getCurrentGames();
      const tilesVisible = 4;
      const needsScrolling = currentGames.length > tilesVisible;
      const tileWidthPercent = 25;
      const translateX = needsScrolling ? this.state.currentIndex * tileWidthPercent : 0;
      this.slideRef.current.style.setProperty('--translate-x', `${translateX}%`);
    }
  }

  override componentWillUnmount(): void {
    this.behaviour.destroy();
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  private setupAutoPlay(): void {
    if (this.state.activeTab === TabType.Explore) return;
    const currentGames = this.getCurrentGames();
    const needsScrolling = currentGames.length > 4;

    if (!needsScrolling || currentGames.length === 0) return;

    this.autoPlayInterval = setInterval(() => {
      this.setState((prevState) => {
        const pingPongSequence = this.generatePingPongSequence(currentGames.length);
        const next = prevState.sequenceIndex + 1;
        const newSequenceIndex = next >= pingPongSequence.length ? 0 : next;
        return {
          sequenceIndex: newSequenceIndex,
          currentIndex: pingPongSequence[newSequenceIndex],
        };
      });
    }, AUTOPLAY_INTERVAL_MS);
  }

  private generatePingPongSequence(length: number): number[] {
    if (length <= 1) return [0];
    const forward = Array.from({ length }, (_, i) => i);
    const backward = Array.from({ length: length - 2 }, (_, i) => length - 2 - i);
    return [...forward, ...backward];
  }

  private getComingSoonGames(): ComingSoonItem[] {
    return this.props.comingSoon;
  }

  private getAvailableNowGames(): FeaturedGameItem[] {
    return this.props.availableNow;
  }

  private getCurrentGames(): ComingSoonItem[] | FeaturedGameItem[] {
    if (this.state.activeTab === TabType.ComingSoon) return this.getComingSoonGames();
    if (this.state.activeTab === TabType.AvailableNow) return this.getAvailableNowGames();
    return [];
  }

  private getDisplayGames(): (ComingSoonItem | FeaturedGameItem)[] {
    const currentGames = this.getCurrentGames();
    if (currentGames.length === 0) return [];

    const displayList = [...currentGames];
    const tilesVisible = 4;
    const needsScrolling = displayList.length > tilesVisible;
    if (!needsScrolling) return displayList;

    const copies = Math.max(3, Math.ceil(12 / displayList.length));
    return Array(copies)
      .fill(displayList)
      .flat();
  }

  private handlePrev = (): void => {
    this.setState((prevState) => {
      const currentGames = this.getCurrentGames();
      return {
        isAutoPlaying: false,
        currentIndex: prevState.currentIndex <= 0 ? currentGames.length - 1 : prevState.currentIndex - 1,
      };
    });
    this.setupAutoPlay();
  };

  private handleNext = (): void => {
    this.setState((prevState) => {
      const currentGames = this.getCurrentGames();
      return {
        isAutoPlaying: false,
        currentIndex: prevState.currentIndex >= currentGames.length - 1 ? 0 : prevState.currentIndex + 1,
      };
    });
    this.setupAutoPlay();
  };

  private handleTabChange = (tab: TabType): void => {
    this.setState({
      activeTab: tab,
      currentIndex: 0,
      sequenceIndex: 0,
      isAutoPlaying: true,
    });
    this.setupAutoPlay();
  };

  private renderCard(params: {
    id: string;
    title: string;
    image?: string;
    badgeText?: string;
    badgeClass?: string;
    meta?: React.ReactNode;
    onClick?: () => void;
    imagePlaceholder?: string;
    quality?: string;
  }): React.ReactElement {
    const { title, image, badgeText, badgeClass, meta, onClick, imagePlaceholder, quality } = params;
    const { resolveImageUrl } = this.props;

    return (
      <button className="game-card-tile" onClick={onClick} type="button">
        <div className="card-image-container">
          {image ? (
            image.startsWith('/') ? (
              <img src={image} alt={title} className="card-image" loading="lazy" />
            ) : (
              <GameBannerImage
                src={image as ImageHash}
                alt={title}
                className="card-image"
                resolveImageUrl={resolveImageUrl}
              />
            )
          ) : (
            <div className="card-image-placeholder">{imagePlaceholder || '🎮'}</div>
          )}
          <div className="card-image-overlay" />
          {badgeText && <span className={`card-badge ${badgeClass || ''}`}>{badgeText}</span>}
          {quality === 'complete' && <span className="quality-dot-complete" title="Complete Content" />}
        </div>
        <div className="card-content">
          <h3 className="card-title" title={title}>
            {title}
          </h3>
          {meta && <div className="card-meta-row">{meta}</div>}
        </div>
      </button>
    );
  }

  private renderTeaserTile(teaser: ComingSoonItem): React.ReactElement {
    return this.renderCard({
      id: teaser.id,
      title: teaser.name,
      image: teaser.bannerImage,
      badgeText: 'COMING SOON',
      badgeClass: 'badge-coming-soon',
      onClick: () => this.props.onGameClick?.(teaser.id),
    });
  }

  private renderGameTile(game: FeaturedGameItem): React.ReactElement {
    const icon = game.tags?.includes('Card Game') ? '🃏' : game.tags?.includes('Word Game') ? '📝' : '🎮';
    return this.renderCard({
      id: `${game.gameId}:${String(game.guid)}`,
      title: game.name,
      image: game.bannerImage,
      imagePlaceholder: icon,
      badgeText: 'AVAILABLE',
      badgeClass: 'badge-available',
      meta: game.tags?.slice(0, 2).map((tag, idx) => (
        <span key={idx} className="card-meta-pill">
          {tag}
        </span>
      )),
      onClick: () => {
        const gameIdentifier = `${game.gameId}:${String(game.guid)}`;
        this.props.onGameClick?.(gameIdentifier);
      },
    });
  }

  private renderExploreAllTile(): React.ReactElement {
    const collageImages = Array.from({ length: 6 }, (_, i) => getStablePlaceholder(`collage-${i}`));

    return (
      <button className="game-card-tile explore-all-card" onClick={this.props.onExploreClick} type="button">
        <div className="explore-collage-grid">
          {collageImages.map((src, idx) => (
            <img key={idx} src={src} alt="" className="collage-image" loading="lazy" />
          ))}
        </div>
        <div className="explore-all-content">
          <span className="explore-all-icon">🧐</span>
          <span className="explore-all-text">
            DISCOVER
            <br />
            1000+ GAMES
          </span>
        </div>
      </button>
    );
  }

  override render(): React.ReactElement {
    const showExploreTab = this.props.showExploreTab ?? false;
    const showExploreTile = this.props.showExploreTile ?? true;
    const explorerGames = this.props.explorerGames ?? [];
    const hasRenderableData =
      this.props.comingSoon.length > 0 ||
      this.props.availableNow.length > 0 ||
      explorerGames.length > 0;

    if (this.props.isLoading && !hasRenderableData) {
      return (
        <div className="coming-soon-carousel">
          <div className="carousel-wrapper">
            <p>Loading games...</p>
          </div>
        </div>
      );
    }

    const isExplore = showExploreTab && this.state.activeTab === TabType.Explore;
    const showExplorePanel = isExplore;

    const currentGames = this.getCurrentGames();
    const needsScrolling = !showExplorePanel && currentGames.length > 4;
    const displayGames = this.getDisplayGames();
    const comingSoonGames = this.getComingSoonGames();
    const availableNowGames = this.getAvailableNowGames();

    return (
      <div
        className={`coming-soon-carousel ${!showExploreTab && showExploreTile ? 'coming-soon-carousel--pinned-only' : ''}`}
      >
        {!showExplorePanel && (
          <>
            <button
              className={`carousel-nav-button carousel-nav-prev ${currentGames.length === 0 || !needsScrolling ? 'hidden' : ''}`}
              onClick={this.handlePrev}
              aria-label="Previous games"
              disabled={currentGames.length === 0 || !needsScrolling}
            >
              ◀
            </button>
            <button
              className={`carousel-nav-button carousel-nav-next ${currentGames.length === 0 || !needsScrolling ? 'hidden' : ''}`}
              onClick={this.handleNext}
              aria-label="Next games"
              disabled={currentGames.length === 0 || !needsScrolling}
            >
              ▶
            </button>
          </>
        )}

        <div className="carousel-wrapper">
          <div className="coming-soon-display-inner">
          <div className="carousel-tabs">
            <button
              className={`carousel-tab ${this.state.activeTab === TabType.ComingSoon ? 'active' : ''}`}
              onClick={() => this.handleTabChange(TabType.ComingSoon)}
            >
              <span className="tab-label">
                <span className="tab-first-letter">C</span>OMING <span className="tab-first-letter">S</span>OON
              </span>
              {comingSoonGames.length > 0 && (
                <span className="tab-count">({comingSoonGames.length})</span>
              )}
            </button>
            <button
              className={`carousel-tab ${this.state.activeTab === TabType.AvailableNow ? 'active' : ''}`}
              onClick={() => this.handleTabChange(TabType.AvailableNow)}
            >
              <span className="tab-label">
                <span className="tab-first-letter">A</span>VAILABLE <span className="tab-first-letter">N</span>OW
              </span>
              {availableNowGames.length > 0 && (
                <span className="tab-count">({availableNowGames.length})</span>
              )}
            </button>
            {showExploreTab && (
              <button
                className={`carousel-tab ${this.state.activeTab === TabType.Explore ? 'active' : ''}`}
                onClick={() => this.handleTabChange(TabType.Explore)}
              >
                <span className="tab-label">
                  <span className="tab-first-letter">E</span>XPLORE
                </span>
                {explorerGames.length > 0 && <span className="tab-count">({explorerGames.length})</span>}
              </button>
            )}
          </div>

          {showExplorePanel ? (
            <ExploreGamesPanel games={explorerGames} onExploreClick={this.props.onExploreClick} />
          ) : (
            <>
              <div className="carousel-track-container">
                <div className="carousel-track" ref={this.trackRef}>
                  {currentGames.length > 0 ? (
                    <div ref={this.slideRef} className="carousel-slide">
                      {displayGames.map((item: ComingSoonItem | FeaturedGameItem, idx) => {
                        if (this.state.activeTab === TabType.ComingSoon) {
                          const teaser = item as ComingSoonItem;
                          return (
                            <div key={`${teaser.id}-${idx}`} className="tile-wrapper">
                              {this.renderTeaserTile(teaser)}
                            </div>
                          );
                        }
                        const game = item as FeaturedGameItem;
                        return (
                          <div key={`${game.gameId}:${game.guid}-${idx}`} className="tile-wrapper">
                            {this.renderGameTile(game)}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="carousel-empty-state">
                      <p className="carousel-empty-message">
                        {this.state.activeTab === TabType.ComingSoon
                          ? 'No games coming soon'
                          : 'No games available now'}
                      </p>
                    </div>
                  )}
                </div>
                {showExploreTile && (
                  <div className="pinned-tile-wrapper">{this.renderExploreAllTile()}</div>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    );
  }
}
