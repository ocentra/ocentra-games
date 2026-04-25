import React from 'react';
import './UnifiedFooter.css';

export interface UnifiedFooterProps {
  appVersion?: string;
  rightContent?: React.ReactNode;
  contentOverride?: React.ReactNode;
}

export const UnifiedFooter: React.FC<UnifiedFooterProps> = ({
  appVersion,
  rightContent,
  contentOverride,
}) => {
  return (
    <footer className="oc-unified-footer">
      <div className="oc-unified-footer__bar">
        <div className="oc-unified-footer__content">
          {contentOverride ?? (
            <span className="oc-unified-footer__text">
              <span>Made with</span>
              <span className="oc-unified-footer__heart">❤</span>
              <span>by</span>
              <a
                href="https://ocentra.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="oc-unified-footer__link"
              >
                ocentra.ca
              </a>
              {appVersion != null && appVersion !== '' ? (
                <span className="oc-unified-footer__version">[ alpha v{appVersion} ]</span>
              ) : null}
            </span>
          )}
        </div>
        {rightContent ? <div className="oc-unified-footer__right">{rightContent}</div> : null}
      </div>
    </footer>
  );
};

