import React, { useState } from 'react';
import type { ReactNode } from 'react';
import './AssetEditorHeader.css';

interface AssetEditorUser {
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  isAdmin?: boolean;
}

interface AssetEditorHeaderProps {
  user: AssetEditorUser | null;
  onLogout?: () => void;
  getImageUrl?: (url: string) => string;
  leftContent?: ReactNode;
  rightSuffixContent?: ReactNode;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  centerIconSrc?: string;
}

function UserPill({
  user,
  onLogout,
  getImageUrl = (u) => u,
}: {
  user: AssetEditorUser;
  onLogout?: () => void;
  getImageUrl?: (url: string) => string;
}) {
  const [imgErr, setImgErr] = useState(false);
  const avatarUrl = user.photoURL && !imgErr ? getImageUrl(user.photoURL) : null;
  const initial = user.displayName?.charAt(0).toUpperCase() ?? 'U';

  return (
    <div className="aeh-profile-section">
      <button type="button" className="aeh-profile-pill" aria-label="Signed in user">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.displayName ?? ''}
            className="aeh-avatar"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="aeh-avatar-placeholder">{initial}</div>
        )}
        <span className="aeh-profile-name">{user.displayName ?? 'Player'}</span>
        {user.isAdmin ? (
          <span className="aeh-admin-badge" title="Administrator">
            Admin
          </span>
        ) : null}
      </button>
      <button type="button" className="aeh-logout-button" onClick={() => onLogout?.()}>
        Sign out
      </button>
    </div>
  );
}

export function AssetEditorHeader({
  user,
  onLogout,
  getImageUrl,
  leftContent,
  rightSuffixContent,
  containerRef,
  centerIconSrc,
}: AssetEditorHeaderProps) {
  return (
    <header className="aeh-header asset-editor-topbar" ref={containerRef}>
      <div className="aeh-drag-handle" data-tauri-drag-region />
      <div className="aeh-left">{leftContent}</div>

      <div className="aeh-center" data-tauri-drag-region>
        <span className="aeh-center-title">
          <span className="aeh-center-word">Asset</span>
          {centerIconSrc ? <img src={centerIconSrc} alt="" className="aeh-center-icon" aria-hidden /> : null}
          <span className="aeh-center-word">Editor</span>
        </span>
      </div>

      <div className="aeh-right">
        {user ? <UserPill user={user} onLogout={onLogout} getImageUrl={getImageUrl} /> : null}
        {rightSuffixContent}
      </div>
    </header>
  );
}
