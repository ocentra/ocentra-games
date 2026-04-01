import React from 'react';
import './GameFooter.css';

export interface GameFooterProps {
  appVersion?: string;
}

export const GameFooter: React.FC<GameFooterProps> = ({ appVersion }) => {
  return (
    <footer className="game-footer">
      <div className="footer-content">
        <span className="footer-text">
          Made with <span className="heart">❤️</span> by{' '}
          <a
            href="https://ocentra.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            ocentra.ca
          </a>
          {appVersion != null && appVersion !== '' && (
            <span className="footer-version"> [ alpha v{appVersion} ]</span>
          )}
        </span>
      </div>
    </footer>
  );
};
