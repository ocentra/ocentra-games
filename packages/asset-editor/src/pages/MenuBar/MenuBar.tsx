import React, { useEffect, useRef, useState } from 'react';
import { SyncMenu } from './SyncMenu/SyncMenu';
import type { SyncStatus } from './SyncMenu/types';
import type { CreateDialogOptions } from '@/pages/MainPage/types';
import './SyncMenu/SyncMenu.css';

interface MenuBarProps {
  onCreateAsset: (folderOrOptions?: string | CreateDialogOptions, maybeOptions?: CreateDialogOptions) => void;
  onRefreshTree: () => void;
  onSyncStatusChange: (status: SyncStatus | null) => void;
  onOpenPreviewWindow?: () => void;
  onOpenInspectorWindow?: () => void;
  onOpenPreviewPanel?: () => void;
  onOpenInspectorPanel?: () => void;
  onResetLayout?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onCreateAsset,
  onRefreshTree,
  onSyncStatusChange,
  onOpenPreviewWindow,
  onOpenInspectorWindow,
  onOpenPreviewPanel,
  onOpenInspectorPanel,
  onResetLayout,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    onSyncStatusChange(syncStatus);
  }, [syncStatus, onSyncStatusChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenu]);

  return (
    <div className="asset-editor__menubar" ref={menuRef}>
      <div className="asset-editor__menubar-left">
        <div className="asset-editor__menu">
          <button
            className="asset-editor__menu-button"
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="asset-editor__menu-dropdown">
              <button
                className="asset-editor__menu-item"
                onClick={() => {
                  onCreateAsset();
                  setActiveMenu(null);
                }}
              >
                <span>Create Asset...</span>
              </button>
            </div>
          )}
        </div>

        <SyncMenu
          isOpen={activeMenu === 'sync'}
          onToggle={() => setActiveMenu(activeMenu === 'sync' ? null : 'sync')}
          onSyncStatusChange={(status) => {
            setSyncStatus(status);
            onSyncStatusChange(status);
          }}
        />

        <div className="asset-editor__menu">
          <button
            className="asset-editor__menu-button"
            onClick={() => setActiveMenu(activeMenu === 'window' ? null : 'window')}
          >
            Window
          </button>
          {activeMenu === 'window' && (
            <div className="asset-editor__menu-dropdown">
              <button
                className="asset-editor__menu-item"
                onClick={() => {
                  (onOpenPreviewWindow ?? onOpenPreviewPanel)?.();
                  setActiveMenu(null);
                }}
              >
                <span>New Preview Panel</span>
              </button>
              <button
                className="asset-editor__menu-item"
                onClick={() => {
                  (onOpenInspectorWindow ?? onOpenInspectorPanel)?.();
                  setActiveMenu(null);
                }}
              >
                <span>New Inspector Panel</span>
              </button>
              {onResetLayout && (
                <>
                  <div className="asset-editor__menu-separator" />
                  <button
                    className="asset-editor__menu-item"
                    onClick={() => {
                      onResetLayout();
                      setActiveMenu(null);
                    }}
                  >
                    <span>Reset Layout</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="asset-editor__menu">
          <button
            className="asset-editor__menu-button"
            onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
          >
            Tools
          </button>
          {activeMenu === 'tools' && (
            <div className="asset-editor__menu-dropdown">
              <button
                className="asset-editor__menu-item"
                onClick={() => {
                  onRefreshTree();
                  setActiveMenu(null);
                }}
              >
                <span>Refresh Tree</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
