import React, { useEffect } from 'react';
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

  const gameGuid = game.guid ?? (detail as { guid?: string } | null)?.guid;
  // Show "Learn More" if it's an asset source with a GUID, even if extended details (rules/etc) failed to load
  const isMadeGame = game.source === 'asset' && !!gameGuid;
  const gamePageUrl = isMadeGame ? `/games/${game.slug}:${gameGuid}` : null;

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
            <span className={`cge-game-card__status-chip cge-game-card__status-chip--${game.source === 'asset' ? 'available' : 'soon'} cge-overlay__source-badge`}>
              {game.source === 'asset' ? '✓ Available' : '◷ Coming Soon'}
            </span>
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

            {isMadeGame && gamePageUrl && (
              <a
                href={gamePageUrl}
                className="cge-overlay__play-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                🎮 Play Now
              </a>
            )}
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
            <>
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

                {/* Variations */}
                <div id="section-variations" className="cge-overlay__section has-content">
                    <h4 className="cge-overlay__section-title">🔄 Variations</h4>
                    <pre className="cge-overlay__text">{renderSection(detail, 'variations') || 'No variations recorded.'}</pre>
                </div>

                {/* Prominent Action Bar */}
                <div className="cge-overlay__action-bar">
                    {isMadeGame && gamePageUrl ? (
                        <div className="cge-overlay__big-actions">
                            <a
                                href={gamePageUrl}
                                className="cge-overlay__btn cge-overlay__btn--play"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span>🎮</span> PLAY NOW
                            </a>
                            <a
                                href={gamePageUrl}
                                className="cge-overlay__btn cge-overlay__btn--learn"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span>📖</span> LEARN MORE
                            </a>
                        </div>
                    ) : (
                        <div className="cge-overlay__big-actions">
                            <button
                                className="cge-overlay__btn cge-overlay__btn--disabled"
                                disabled
                            >
                                <span>🚧</span> COMING SOON
                            </button>
                        </div>
                    )}
                </div>

                {((): React.ReactNode => {
                  if (!detail.cursorFind) return null;
                  const cf = detail.cursorFind as Record<string, unknown>;
                  const cfText = Object.entries(cf)
                    .filter(([k, v]) => k !== 'alsoKnownAs' && v && (Array.isArray(v) ? v.length > 0 : true))
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

              <div className="cge-overlay__footer">
                 <p className="cge-overlay__footer-note">
                    {isMadeGame ? 'This game is fully playable on the platform.' : 'This game is currently in our development backlog.'}
                 </p>
              </div>
            </>
          ) : (
            <div className="cge-overlay__no-data cge-overlay__no-data--center">
              <h3>Oops!</h3>
              <p>Could not load extended game details.</p>
              <button className="cge-overlay__close-btn" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
