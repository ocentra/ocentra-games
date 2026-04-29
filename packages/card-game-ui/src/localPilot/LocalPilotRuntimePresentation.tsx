import React from 'react';
import './LocalPilotRuntimePresentation.css';

export interface LocalPilotArenaOverlayProps {
  countdown: number | null;
  displayName: string;
  hasGameState: boolean;
  loading: boolean;
  playerCount: number;
}

export interface LocalPilotStageOverlayProps {
  countdown: number | null;
  error?: string | null;
  isGameOver: boolean;
  loading: boolean;
  restartDisabled?: boolean;
  startingMatch: boolean;
  winnersText?: string | null;
  onRestart?: () => void;
}

export const LocalPilotArenaOverlay: React.FC<LocalPilotArenaOverlayProps> = ({
  countdown,
  displayName,
  hasGameState,
  loading,
  playerCount,
}) => (
  <div className="playable-table-presence" data-testid="claim-pilot-table">
    {!hasGameState ? (
      <div className="playable-table-stage__empty">
        <h2>Preparing Table</h2>
        <p>
          {loading
            ? `Loading ${displayName} layout...`
            : countdown && countdown > 0
              ? `Dealing a ${playerCount}-player table in ${countdown}...`
              : 'Shuffling the first hand.'}
        </p>
      </div>
    ) : null}
  </div>
);

export const LocalPilotStageOverlay: React.FC<LocalPilotStageOverlayProps> = ({
  countdown,
  error,
  isGameOver,
  loading,
  restartDisabled = false,
  startingMatch,
  winnersText,
  onRestart,
}) => {
  const actionLabel = startingMatch
    ? 'Dealing...'
    : isGameOver
      ? 'New Match'
      : (countdown && countdown > 0) || loading
        ? 'Deal Now'
        : 'Redeal';

  return (
    <>
      <aside className="playable-runtime-dock">
        <button
          type="button"
          className="playable-runtime-dock__action"
          data-testid="claim-pilot-redeal"
          onClick={onRestart}
          disabled={restartDisabled}
        >
          {actionLabel}
        </button>

        {error ? (
          <div className="playable-runtime-dock__panel playable-runtime-dock__panel--error">
            {error}
          </div>
        ) : null}

        {isGameOver && winnersText ? (
          <div className="playable-runtime-dock__panel playable-runtime-dock__panel--result">
            <span className="playable-runtime-dock__label">Result</span>
            <p>{winnersText}</p>
          </div>
        ) : null}
      </aside>
    </>
  );
};
