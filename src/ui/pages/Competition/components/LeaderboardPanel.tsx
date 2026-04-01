import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@ocentra/api-domain/competition';

interface LeaderboardPanelProps {
  gameType: number;
  seasonId: string;
  lastUpdated: string;
  entries: LeaderboardEntry[];
  userEntry: LeaderboardEntry | null;
  nearbyAbove: LeaderboardEntry[];
  nearbyBelow: LeaderboardEntry[];
  onRefresh: (gameType: number) => Promise<void>;
}

export function LeaderboardPanel({
  gameType,
  seasonId,
  lastUpdated,
  entries,
  userEntry,
  nearbyAbove,
  nearbyBelow,
  onRefresh,
}: LeaderboardPanelProps) {
  const [gameTypeInput, setGameTypeInput] = useState(String(gameType));

  useEffect(() => {
    setGameTypeInput(String(gameType));
  }, [gameType]);

  return (
    <section className="cp-panel">
      <h2 className="cp-panel-title">Leaderboard</h2>
      <p className="cp-panel-subtitle">
        Season: <strong>{seasonId || '-'}</strong> | Updated: <strong>{lastUpdated || '-'}</strong>
      </p>

      <div className="cp-row cp-wrap">
        <input
          className="cp-input"
          type="number"
          min={1}
          value={gameTypeInput}
          onChange={(event) => setGameTypeInput(event.target.value)}
          placeholder="Game type id"
        />
        <button
          type="button"
          className="cp-btn cp-btn-primary"
          onClick={() => {
            const parsedGameType = Number(gameTypeInput);
            if (!Number.isFinite(parsedGameType)) {
              return;
            }
            void onRefresh(parsedGameType);
          }}
        >
          Load
        </button>
      </div>

      <ul className="cp-list">
        {entries.slice(0, 10).map((entry) => (
          <li key={`${entry.user_id}-${entry.rank}`} className="cp-list-item">
            <span className="cp-rank">#{entry.rank}</span>
            <span className="cp-id">{entry.user_id}</span>
            <span className="cp-score">{entry.score}</span>
          </li>
        ))}
        {entries.length === 0 && <li className="cp-empty">No leaderboard entries</li>}
      </ul>

      <div className="cp-metrics">
        <div className="cp-metric-block">
          <h3 className="cp-metric-title">My Rank</h3>
          {userEntry ? (
            <div className="cp-metric-content">
              <span>Rank: {userEntry.rank}</span>
              <span>Score: {userEntry.score}</span>
              <span>W/L: {userEntry.wins}/{userEntry.losses}</span>
            </div>
          ) : (
            <p className="cp-empty">No personal rank</p>
          )}
        </div>
        <div className="cp-metric-block">
          <h3 className="cp-metric-title">Nearby</h3>
          {(nearbyAbove.length > 0 || nearbyBelow.length > 0) ? (
            <ul className="cp-inline-list">
              {[...nearbyAbove, ...nearbyBelow].map((entry) => (
                <li key={`${entry.user_id}-${entry.rank}`} className="cp-inline-list-item">
                  #{entry.rank} {entry.user_id}
                </li>
              ))}
            </ul>
          ) : (
            <p className="cp-empty">No nearby ranks</p>
          )}
        </div>
      </div>
    </section>
  );
}
