import React, { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const MinIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19 13H5v-2h14v2z" />
  </svg>
);

const MaxIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="1" />
  </svg>
);

const RestoreIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 4H4v4M4 20h4v-4M20 8V4h-4M16 20h4v-4" />
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
  </svg>
);

export const WindowControls: React.FC = () => {
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    setIsTauri(!!(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window));
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    void getCurrentWindow().isMaximized().then(setIsMaximized);
  }, [isTauri]);

  const handleMinimize = useCallback(() => {
    if (isTauri) getCurrentWindow().minimize();
  }, [isTauri]);

  const handleMaximize = useCallback(() => {
    if (!isTauri) return;
    getCurrentWindow().toggleMaximize();
    setIsMaximized((v) => !v);
  }, [isTauri]);

  const handleClose = useCallback(() => {
    if (isTauri) getCurrentWindow().close();
  }, [isTauri]);

  if (!isTauri) return null;

  return (
    <div className="asset-editor__window-controls">
      <button type="button" className="asset-editor__window-btn" title="Minimize" aria-label="Minimize" onClick={handleMinimize}>
        <MinIcon />
      </button>
      <button type="button" className="asset-editor__window-btn" title={isMaximized ? 'Restore' : 'Maximize'} aria-label={isMaximized ? 'Restore' : 'Maximize'} onClick={handleMaximize}>
        {isMaximized ? <RestoreIcon /> : <MaxIcon />}
      </button>
      <button type="button" className="asset-editor__window-btn asset-editor__window-btn--close" title="Close" aria-label="Close" onClick={handleClose}>
        <CloseIcon />
      </button>
    </div>
  );
};
