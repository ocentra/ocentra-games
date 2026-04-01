import type { Game } from '../types';
import { CATEGORY_ICONS } from '../types';
import './GameListRow.css';

interface Props {
  game: Game;
  onClick: (game: Game) => void;
}

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

export function GameListRow({ game, onClick }: Props) {
  const fillClass =
    game.completenessPercent >= 75 ? 'cge-list-row__bar-fill--high'
    : game.completenessPercent >= 40 ? 'cge-list-row__bar-fill--medium'
    : 'cge-list-row__bar-fill--low';

  return (
    <div
      className="cge-list-row"
      onClick={() => onClick(game)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(game)}
    >
      <span className="cge-list-row__name">{game.name}</span>
      <span className="cge-list-row__cat">
        {CATEGORY_ICONS[game.category] ?? '📦'} {game.subcategory ? `${game.category} / ${game.subcategory}` : game.category}
      </span>
      <span className="cge-list-row__players">{game.players || '—'}</span>
      <span className={`cge-list-row__quality cge-list-row__quality--${game.quality}`}>{game.quality}</span>
      <span className="cge-list-row__status">
        {game.file_exists ? '✓ JSON' : '✗ No JSON'} · {game.link_valid ?? 'unknown'}
      </span>
      <div className="cge-list-row__bar-track">
        <div className={`cge-list-row__bar-fill ${fillClass}`} style={{ width: `${game.completenessPercent}%` }} />
      </div>
      <span className="cge-list-row__pct">{game.completenessPercent}%</span>
    </div>
  );
}
