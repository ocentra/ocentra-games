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
  const [open, setOpen] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const avatarUrl = user.photoURL && !imgErr ? getImageUrl(user.photoURL) : null;
  const initial = user.displayName?.charAt(0).toUpperCase() ?? 'U';

  return (
    <div className="aeh-profile-section">
      <button
        type="button"
        className="aeh-profile-pill"
        onClick={() => setOpen((v) => !v)}
        aria-label="User profile menu"
        aria-expanded={open}
      >
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
        {user.isAdmin && <span className="aeh-admin-badge" title="Administrator">👑</span>}
        <span className="aeh-profile-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="aeh-profile-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Close profile menu"
          />
          <div className="aeh-profile-menu">
            <div className="aeh-profile-menu-header">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.displayName ?? ''} className="aeh-menu-avatar" onError={() => setImgErr(true)} />
              ) : (
                <div className="aeh-menu-avatar-placeholder">{initial}</div>
              )}
              <div className="aeh-profile-menu-info">
                <div className="aeh-profile-menu-name">{user.displayName}</div>
                <div className="aeh-profile-menu-email">{user.email}</div>
              </div>
            </div>
            <div className="aeh-profile-divider" />
            <button
              type="button"
              className="aeh-logout-button"
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
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
}: AssetEditorHeaderProps) {
  return (
    <header className="aeh-header asset-editor-topbar" ref={containerRef}>
      <div className="aeh-drag-handle" data-tauri-drag-region />
      <div className="aeh-left">{leftContent}</div>

      <div className="aeh-center" data-tauri-drag-region>
        <span className="aeh-center-title">
          <span className="aeh-center-word">Asset</span>
          <span className="aeh-center-sep"> </span>
          <span className="aeh-center-word">Editor</span>
        </span>
      </div>

      <div className="aeh-right">
        {user && (
          <UserPill user={user} onLogout={onLogout} getImageUrl={getImageUrl} />
        )}
        {rightSuffixContent}
      </div>
    </header>
  );
}
