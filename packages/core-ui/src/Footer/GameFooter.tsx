import React from 'react';
import './GameFooter.css';

export interface GameFooterProps {
  appVersion?: string;
  rightContent?: React.ReactNode;
}

export const GameFooter: React.FC<GameFooterProps> = ({ appVersion, rightContent }) => {
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
        {rightContent && <div className="footer-right-content">{rightContent}</div>}
      </div>
    </footer>
  );
};
