import React from 'react';
import styles from './GameFooter.module.css';

export interface GameFooterProps {
  appVersion?: string;
  rightContent?: React.ReactNode;
}

export const GameFooter: React.FC<GameFooterProps> = ({ appVersion, rightContent }) => {
  return (
    <footer className={styles.gameFooter}>
      <div className={styles.footerContent}>
        <span className={styles.footerText}>
          Made with <span className={styles.heart}>❤️</span> by{' '}
          <a
            href="https://ocentra.ca"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            ocentra.ca
          </a>
          {appVersion != null && appVersion !== '' && (
            <span className={styles.footerVersion}> [ alpha v{appVersion} ]</span>
          )}
        </span>
        {rightContent && <div className={styles.footerRightContent}>{rightContent}</div>}
      </div>
    </footer>
  );
};
