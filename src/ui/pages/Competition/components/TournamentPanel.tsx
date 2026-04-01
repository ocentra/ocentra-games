import { useEffect, useState } from 'react';
import type { TournamentBracketResponse } from '@ocentra/api-domain/competition';

interface TournamentPanelProps {
  tournamentId: string;
  registering: boolean;
  bracket: TournamentBracketResponse | null;
  onLoadBracket: (tournamentId: string) => Promise<void>;
  onRegister: (tournamentId: string) => Promise<void>;
}

export function TournamentPanel({
  tournamentId,
  registering,
  bracket,
  onLoadBracket,
  onRegister,
}: TournamentPanelProps) {
  const [tournamentInput, setTournamentInput] = useState(tournamentId);
  const rounds = Array.isArray(bracket?.rounds) ? bracket.rounds : [];

  useEffect(() => {
    setTournamentInput(tournamentId);
  }, [tournamentId]);

  return (
    <section className="cp-panel">
      <h2 className="cp-panel-title">Tournament</h2>
      <p className="cp-panel-subtitle">Tournament ID: {tournamentId || '-'}</p>

      <div className="cp-row cp-wrap">
        <input
          className="cp-input"
          type="text"
          value={tournamentInput}
          placeholder="Tournament id"
          onChange={(event) => setTournamentInput(event.target.value)}
        />
        <button
          type="button"
          className="cp-btn cp-btn-secondary"
          onClick={() => {
            void onLoadBracket(tournamentInput);
          }}
        >
          Load Bracket
        </button>
        <button
          type="button"
          className="cp-btn cp-btn-primary"
          disabled={registering}
          onClick={() => {
            void onRegister(tournamentInput);
          }}
        >
          {registering ? 'Registering...' : 'Register'}
        </button>
      </div>

      {bracket ? (
        <ul className="cp-list">
          {rounds.map((round, index) => (
            <li key={`${round.round}-${index}`} className="cp-list-item cp-list-item-block">
              <span className="cp-id">Round {round.round}</span>
              <span className="cp-score">
                Matches: {Array.isArray(round.matches) ? round.matches.length : 0}
              </span>
            </li>
          ))}
          {rounds.length === 0 && <li className="cp-empty">No rounds yet</li>}
        </ul>
      ) : (
        <div className="cp-empty">No tournament bracket loaded</div>
      )}
    </section>
  );
}
