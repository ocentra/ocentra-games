import React from 'react';
import type { SyncStatus } from './types';
import './SyncMenu.css';

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus | null;
  syncError: string | null;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  syncStatus,
  syncError,
}) => {
  return (
    <>
      {syncStatus && (
        <div className="asset-editor__sync-status">
          <span className="asset-editor__sync-status-item" title="Synced assets">
            ✅ {syncStatus.synced}
          </span>
          {syncStatus.changed !== undefined && syncStatus.changed > 0 && (
            <span className="asset-editor__sync-status-item asset-editor__sync-status-item--warning" title="Changed assets">
              ⚠️ {syncStatus.changed}
            </span>
          )}
          {syncStatus.notInCloud !== undefined && syncStatus.notInCloud > 0 && (
            <span className="asset-editor__sync-status-item asset-editor__sync-status-item--error" title="Assets not in cloud">
              ❌ {syncStatus.notInCloud}
            </span>
          )}
        </div>
      )}
      {syncError && (
        <div className="asset-editor__sync-error" title={syncError}>
          ⚠️ Error
        </div>
      )}
    </>
  );
};

