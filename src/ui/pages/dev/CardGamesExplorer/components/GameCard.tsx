import { useMemo } from 'react';
import { getPlaceholderImageUrl, placeholderImageCount } from '@ocentra/app-assets/placeholders';
import type { Game } from '../types';
import { SECTIONS, CATEGORY_ICONS, SECTION_LABELS } from '../types';
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

interface Props {
  game: Game;
  onClick: (game: Game) => void;
}

export function GameCard({ game, onClick }: Props) {
  const imgSrc = useMemo(() => getPlaceholderImageUrl(stableIndex(game.slug || game.name)), [game.slug, game.name]);
  const fillClass = game.completenessPercent >= 75 ? 'is-high' : game.completenessPercent >= 40 ? 'is-medium' : 'is-low';
  const qualityColor = QUALITY_COLORS[game.quality] ?? '#6b7280';
  const filledSections = SECTIONS.filter(s => game.completeness[s]);

  return (
    <div
      className={`cge-game-card cge-game-card--${game.quality}`}
      onClick={() => onClick(game)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(game)}
      style={{ '--quality-color': qualityColor } as React.CSSProperties}
    >
      <div className="cge-game-card__banner">
        <img
          src={imgSrc}
          alt=""
          className="cge-game-card__banner-img"
          loading="lazy"
          aria-hidden="true"
        />
        <div className="cge-game-card__banner-overlay" />

        <span className="cge-game-card__cat-badge">
          {CATEGORY_ICONS[game.category] ?? '📦'} {game.subcategory ? `${game.category} / ${game.subcategory}` : game.category}
        </span>

        <span className={`cge-game-card__quality-chip cge-game-card__quality-chip--${game.quality}`}>
          {game.quality}
        </span>
      </div>

      <div className="cge-game-card__body">
        <h3 className="cge-game-card__name">{game.name}</h3>

        {game.description && (
          <p className="cge-game-card__desc">
            {game.description.length > 100
              ? `${game.description.slice(0, 100)}…`
              : game.description}
          </p>
        )}

        <div className="cge-game-card__meta">
          {game.players && <span className="cge-meta-pill">👥 {game.players}</span>}
          {game.deck && <span className="cge-meta-pill">🃏 {game.deck}</span>}
          {game.duration && <span className="cge-meta-pill">⏱ {game.duration}</span>}
          {game.difficulty && <span className="cge-meta-pill">⚡ {game.difficulty}</span>}
        </div>

        <div className="cge-game-card__dots">
          {SECTIONS.map(s => (
            <span
              key={s}
              className={`cge-dot ${game.completeness[s] ? 'is-filled' : ''}`}
              title={SECTION_LABELS[s]?.label ?? s}
            />
          ))}
          <span className="cge-game-card__sections-label">
            {filledSections.length}/{SECTIONS.length} sections
          </span>
        </div>

        <div className="cge-game-card__progress">
          <div className="cge-progress-track">
            <div className={`cge-progress-fill ${fillClass}`} style={{ width: `${game.completenessPercent}%` }} />
          </div>
          <span className="cge-progress-label">{game.completenessPercent}%</span>
        </div>
      </div>
    </div>
  );
}
