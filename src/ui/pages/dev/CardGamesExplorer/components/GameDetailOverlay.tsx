import { useEffect } from 'react';
import type { Game, GameDetail } from '../types';
import { SECTIONS, SECTION_LABELS, CATEGORY_ICONS } from '../types';
import { renderSection } from '../helpers';
import './GameDetailOverlay.css';

interface Props {
  game: Game;
  detail: GameDetail | null;
  loading: boolean;
  onClose: () => void;
}

export function GameDetailOverlay({ game, detail, loading, onClose }: Props) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const displaySections = SECTIONS.filter(s => s !== 'ai' && s !== 'sources');

  return (
    <div
      className="cge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Game detail: ${game.name}`}
    >
      <button
        type="button"
        className="cge-overlay__backdrop"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div className="cge-overlay__panel">
        <button
          className="cge-overlay__close"
          onClick={onClose}
          aria-label="Close detail panel"
        >
          ✕
        </button>

        {/* Header */}
        <div className="cge-overlay__header">
          <h2 className="cge-overlay__title">{game.name}</h2>
          <div className="cge-overlay__meta">
            <span className={`cge-quality-badge cge-quality-badge--${game.quality}`}>{game.quality}</span>
            <span>{CATEGORY_ICONS[game.category] ?? '📦'} {game.subcategory ? `${game.category} / ${game.subcategory}` : game.category}</span>
            {game.players && <span>👥 {game.players}</span>}
            {game.deck && <span>🃏 {game.deck}</span>}
            {game.duration && <span>⏱ {game.duration}</span>}
            {game.difficulty && <span>⚡ {game.difficulty}</span>}
            <span>✅ {game.completenessPercent}%</span>
          </div>

          {/* Also known as */}
          {(() => {
            const akaList =
              ((detail?.cursorFind as { alsoKnownAs?: string[] } | undefined)?.alsoKnownAs) ??
              game.alsoKnownAs;
            if (!akaList?.length) return null;
            return <div className="cge-overlay__aka">Also known as: {akaList.join(', ')}</div>;
          })()}

          {/* Section completeness dots / Nav buttons */}
          <div className="cge-overlay__dots">
            {displaySections.map(s => (
              <button
                key={s}
                type="button"
                className={`cge-overlay__dot ${game.completeness[s] ? 'is-filled' : ''}`}
                onClick={() => scrollToSection(s)}
              >
                {SECTION_LABELS[s]?.icon} {SECTION_LABELS[s]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="cge-overlay__body">
          {loading ? (
            <div className="cge-overlay__loading">
              <div className="cge-spinner" />
              <p>Loading details…</p>
            </div>
          ) : detail ? (
            <div className="cge-overlay__sections">
              {displaySections.map(s => {
                const text = renderSection(detail, s);
                if (!text && !game.completeness[s]) return null;

                return (
                  <div
                    key={s}
                    id={`section-${s}`}
                    className={`cge-overlay__section ${text ? 'has-content' : 'no-content'}`}
                  >
                    <h4 className="cge-overlay__section-title">
                      {SECTION_LABELS[s]?.icon} {SECTION_LABELS[s]?.label}
                    </h4>
                    {text
                      ? <pre className="cge-overlay__text">{text}</pre>
                      : <p className="cge-overlay__no-data">No content</p>}
                  </div>
                );
              })}

              {((): React.ReactNode => {
                if (!detail.cursorFind) return null;
                const cf = detail.cursorFind as Record<string, unknown>;
                const cfText = Object.entries(cf)
                  .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
                  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                  .join('\n');
                if (!cfText) return null;
                return (
                  <div className="cge-overlay__section has-content">
                    <h4 className="cge-overlay__section-title">🔎 Additional Info</h4>
                    <pre className="cge-overlay__text">{cfText}</pre>
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className="cge-overlay__no-data cge-overlay__no-data--center">
              Could not load game details
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
