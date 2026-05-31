import { useMemo } from 'react';
import { getPlaceholderImageUrl, placeholderImageCount } from '@ocentra/app-assets/placeholders';
import type { GamesExplorerGame } from './types';
import { SECTIONS, CATEGORY_ICONS, SECTION_LABELS } from './types';
import {
  gamesExplorerReleaseStatusLabel,
  gamesExplorerReleaseStatusShortLabel,
  isGamesExplorerGameAvailable,
} from './releaseStatus';
import './GameCard.css';

function stableIndex(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return hash % placeholderImageCount;
}

const QUALITY_COLORS: Record<string, string> = {
  complete: '#10b981',
  partial: '#f59e0b',
  placeholder: '#ef4444',
};

export interface GameCardProps {
  game: GamesExplorerGame;
  onGameClick?: (game: GamesExplorerGame) => void;
}

export function GameCard({ game, onGameClick }: GameCardProps) {
  const imgSrc = useMemo(() => getPlaceholderImageUrl(stableIndex(game.slug || game.name)), [game.slug, game.name]);
  const pct = game.completenessPercent ?? 0;
  const fillClass = pct >= 75 ? 'is-high' : pct >= 40 ? 'is-medium' : 'is-low';
  const quality = game.quality ?? 'complete';
  const isAvailable = isGamesExplorerGameAvailable(game.releaseStatus);
  const qualityColor = isAvailable ? '#3b82f6' : (QUALITY_COLORS[quality] ?? '#6b7280');
  const completeness = game.completeness ?? {};
  const filledSections = SECTIONS.filter((s) => completeness[s]);
  const category = game.subcategory ? `${game.category} / ${game.subcategory}` : game.category;
  const imageAlt = `${game.name} ${category} catalog preview artwork`;

  const handleClick = () => onGameClick?.(game);

  return (
    <div
      className={`cge-game-card cge-game-card--${quality} ${isAvailable ? 'cge-game-card--asset' : 'cge-game-card--catalog'}`}
      onClick={handleClick}
      {...(onGameClick && {
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && handleClick(),
      })}
      style={{ '--quality-color': qualityColor } as React.CSSProperties}
    >
      <div className="cge-game-card__banner">
        <img
          src={imgSrc}
          alt={imageAlt}
          className="cge-game-card__banner-img"
          loading="lazy"
        />
        <div className="cge-game-card__banner-overlay" />
        <span className="cge-game-card__cat-badge">
          {CATEGORY_ICONS[game.category] ?? '📦'} {game.subcategory ? `${game.category} / ${game.subcategory}` : game.category}
        </span>
        <span
          className={`cge-game-card__status-chip cge-game-card__status-chip--${isAvailable ? 'available' : 'soon'}`}
          title={gamesExplorerReleaseStatusLabel(game.releaseStatus)}
        >
          {isAvailable ? 'Available' : gamesExplorerReleaseStatusShortLabel(game.releaseStatus)}
        </span>
      </div>

      <div className="cge-game-card__body">
        <h3 className="cge-game-card__name">{game.name}</h3>

        {game.description && (
          <p className="cge-game-card__desc">
            {game.description.length > 100 ? `${game.description.slice(0, 100)}…` : game.description}
          </p>
        )}

        <div className="cge-game-card__meta">
          {game.players && <span className="cge-meta-pill">👥 {game.players}</span>}
          {game.deck && <span className="cge-meta-pill">🃏 {game.deck}</span>}
          {game.duration && <span className="cge-meta-pill">⏱ {game.duration}</span>}
          {game.difficulty && <span className="cge-meta-pill">⚡ {game.difficulty}</span>}
        </div>

        {Object.keys(completeness).length > 0 && (
          <div className="cge-game-card__dots">
            {SECTIONS.map((s) => (
              <span
                key={s}
                className={`cge-dot ${completeness[s] ? 'is-filled' : ''}`}
                title={SECTION_LABELS[s]?.label ?? s}
              />
            ))}
            <span className="cge-game-card__sections-label">
              {filledSections.length}/{SECTIONS.length} sections
            </span>
          </div>
        )}

        {(game.completenessPercent != null || filledSections.length > 0) && (
          <div className="cge-game-card__progress">
            <div className="cge-progress-track">
              <div className={`cge-progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="cge-progress-label">{pct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
