import type { ReactNode } from 'react';
import './GameBadgesOverlay.css';

export interface GameBadgesOverlayProps {
  availableNow?: boolean;
  freeToPlay?: boolean;
  solanaVerified?: boolean;
  solanaImgSrc?: string;
  aiBenchmark?: boolean;
  leaderboard?: boolean;
  className?: string;
  trailingContent?: ReactNode;
}

export function GameBadgesOverlay({
  availableNow = false,
  freeToPlay = false,
  solanaVerified = false,
  solanaImgSrc,
  aiBenchmark = false,
  leaderboard = false,
  className = '',
  trailingContent,
}: GameBadgesOverlayProps) {
  const showSolana = solanaVerified && solanaImgSrc;
  return (
    <div className={`game-badges-overlay ${className}`}>
      <div className="badges-container">
        {availableNow && (
          <span className="badge badge-primary">AVAILABLE NOW</span>
        )}
        {freeToPlay && (
          <span className="badge badge-secondary">FREE TO PLAY</span>
        )}
        {showSolana && (
          <span className="badge badge-blockchain">
            <img src={solanaImgSrc} alt="Solana" className="badge-solana-logo" />
            <span>SOLANA VERIFIED</span>
          </span>
        )}
        {aiBenchmark && (
          <span className="badge badge-ai">AI BENCHMARK</span>
        )}
        {leaderboard && (
          <span className="badge badge-leaderboard">LEADERBOARD</span>
        )}
        {trailingContent && (
          <div className="badges-trailing-content">{trailingContent}</div>
        )}
      </div>
    </div>
  );
}
