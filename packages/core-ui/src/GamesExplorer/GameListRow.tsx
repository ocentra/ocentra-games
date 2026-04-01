import type { GamesExplorerGame } from './types';
import { CATEGORY_ICONS } from './types';
import './GameListRow.css';

export function GameListRowHeader() {
  return (
    <div className="cge-list-header" aria-hidden="true">
      <span className="cge-list-row__name">Name</span>
      <span className="cge-list-row__cat">Category</span>
      <span className="cge-list-row__players">Players</span>
      <span className="cge-list-row__quality">Quality</span>
      <span className="cge-list-row__status">JSON / link</span>
      <div />
      <span className="cge-list-row__pct">%</span>
    </div>
  );
}

export interface GameListRowProps {
  game: GamesExplorerGame;
  onGameClick?: (game: GamesExplorerGame) => void;
}

export function GameListRow({ game, onGameClick }: GameListRowProps) {
  const pct = game.completenessPercent ?? 0;
  const fillClass =
    pct >= 75 ? 'cge-list-row__bar-fill--high'
    : pct >= 40 ? 'cge-list-row__bar-fill--medium'
    : 'cge-list-row__bar-fill--low';
  const quality = game.quality ?? 'complete';
  const status =
    game.file_exists != null
      ? `${game.file_exists ? '✓ JSON' : '✗ No JSON'} · ${game.link_valid ?? 'unknown'}`
      : '—';

  const handleClick = () => onGameClick?.(game);

  return (
    <div
      className="cge-list-row"
      onClick={handleClick}
      {...(onGameClick && {
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && handleClick(),
      })}
    >
      <span className="cge-list-row__name">{game.name}</span>
      <span className="cge-list-row__cat">
        {CATEGORY_ICONS[game.category] ?? '📦'} {game.subcategory ? `${game.category} / ${game.subcategory}` : game.category}
      </span>
      <span className="cge-list-row__players">{game.players || '—'}</span>
      <span className={`cge-list-row__quality cge-list-row__quality--${quality}`}>{quality}</span>
      <span className="cge-list-row__status">{status}</span>
      <div className="cge-list-row__bar-track">
        <div className={`cge-list-row__bar-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="cge-list-row__pct">{pct}%</span>
    </div>
  );
}
