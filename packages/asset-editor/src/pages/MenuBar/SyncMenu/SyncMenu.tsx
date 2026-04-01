import React from 'react';
import { useSyncMenu } from './useSyncMenu';
import './SyncMenu.css';

interface SyncMenuProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onSyncStatusChange?: (status: ReturnType<typeof useSyncMenu>['syncStatus']) => void;
  onSyncErrorChange?: (error: string | null) => void;
}

export const SyncMenu: React.FC<SyncMenuProps> = ({ isOpen, onToggle, onSyncStatusChange, onSyncErrorChange }) => {
  const {
    syncStatus,
    isSyncing,
    syncError,
    syncTarget,
    availableTargets,
    handleSyncToR2,
    handleSyncFromR2,
    handleScanR2Status,
    handleSelectSyncTarget,
  } = useSyncMenu();

  React.useEffect(() => {
    onSyncStatusChange?.(syncStatus);
  }, [syncStatus, onSyncStatusChange]);

  React.useEffect(() => {
    onSyncErrorChange?.(syncError || null);
  }, [syncError, onSyncErrorChange]);

  return (
    <div className="asset-editor__menu">
      <button
        className="asset-editor__menu-button"
        onClick={onToggle}
        title={`${syncTarget.label}${syncTarget.configured ? '' : ' (not configured)'}`}
      >
        Sync
        <span className={`asset-editor__sync-target-chip asset-editor__sync-target-chip--${syncTarget.key}`}>
          {syncTarget.key === 'real-cloud' ? 'REAL' : 'DEV'}
        </span>
        {syncStatus && syncStatus.changed !== undefined && syncStatus.changed > 0 && (
          <span className="asset-editor__menu-badge">{syncStatus.changed}</span>
        )}
      </button>
      {isOpen && (
        <div className="asset-editor__menu-dropdown">
          <div className="asset-editor__sync-target-summary">
            <div className="asset-editor__sync-target-title">{syncTarget.label}</div>
            <div className="asset-editor__sync-target-description">
              {syncTarget.configured ? syncTarget.description : `${syncTarget.description} (not configured)`}
            </div>
          </div>
          <div className="asset-editor__sync-target-list">
            {availableTargets.map((target) => (
              <button
                key={target.key}
                className={`asset-editor__menu-item asset-editor__menu-item--target${target.key === syncTarget.key ? ' is-active' : ''}`}
                onClick={() => handleSelectSyncTarget(target.key)}
                disabled={!target.configured && target.key !== syncTarget.key}
                title={target.configured ? target.workerUrl : 'Not configured'}
              >
                <span className="asset-editor__menu-icon">{target.key === syncTarget.key ? '●' : '○'}</span>
                <span>{target.label}</span>
                {!target.configured && (
                  <span className="asset-editor__sync-target-unconfigured">Not Configured</span>
                )}
              </button>
            ))}
          </div>
          <div className="asset-editor__menu-separator" />
          {syncStatus && (
            <div className="asset-editor__sync-status asset-editor__sync-status--dropdown">
              <span className="asset-editor__sync-status-item" title="Synced assets">OK {syncStatus.synced ?? 0}</span>
              {syncStatus.changed !== undefined && syncStatus.changed > 0 && (
                <span className="asset-editor__sync-status-item asset-editor__sync-status-item--warning" title="Changed assets">Changed {syncStatus.changed}</span>
              )}
              {syncStatus.notInCloud !== undefined && syncStatus.notInCloud > 0 && (
                <span className="asset-editor__sync-status-item asset-editor__sync-status-item--error" title="Assets not in cloud">Missing {syncStatus.notInCloud}</span>
              )}
            </div>
          )}
          {syncError && (
            <div className="asset-editor__sync-error" title={syncError}>Error: {syncError}</div>
          )}
          {(syncStatus || syncError) && <div className="asset-editor__menu-separator" />}
          <button
            className="asset-editor__menu-item"
            onClick={() => {
              handleSyncToR2();
              onToggle?.();
            }}
            disabled={isSyncing || !syncTarget.configured}
          >
            <span className="asset-editor__menu-icon">{isSyncing ? '...' : 'Up'}</span>
            <span>Sync to Cloud</span>
            {syncStatus && syncStatus.changed !== undefined && syncStatus.changed > 0 && (
              <span className="asset-editor__menu-badge">{syncStatus.changed}</span>
            )}
          </button>
          <button
            className="asset-editor__menu-item"
            onClick={() => {
              handleSyncFromR2();
              onToggle?.();
            }}
            disabled={isSyncing || !syncTarget.configured}
          >
            <span className="asset-editor__menu-icon">{isSyncing ? '...' : 'Down'}</span>
            <span>Sync from Cloud</span>
          </button>
          <button
            className="asset-editor__menu-item"
            onClick={() => {
              handleScanR2Status();
              onToggle?.();
            }}
            disabled={isSyncing || !syncTarget.configured}
          >
            <span className="asset-editor__menu-icon">{isSyncing ? '...' : 'Scan'}</span>
            <span>Scan Cloud Status</span>
          </button>
        </div>
      )}
    </div>
  );
};
