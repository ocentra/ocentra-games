import React from 'react';
import type { ViewMode } from './types';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { tryAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import './PreviewPanel.css';

interface PreviewPanelHeaderProps {
  assetId: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  navigationHistory: Array<{ name: string; path: string }>;
  onBack?: () => void;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  isNonAssetFile?: boolean;
  toolbar?: React.ReactNode;
  hideBreadcrumb?: boolean;
}

export const PreviewPanelHeader: React.FC<PreviewPanelHeaderProps> = ({
  assetId,
  viewMode,
  setViewMode,
  navigationHistory,
  onBack,
  onNavigateToAsset,
  isNonAssetFile = false,
  toolbar,
  hideBreadcrumb = false,
}) => {
  return (
    <div className="preview-panel__header">
      <div className="preview-panel__header-left">
        {navigationHistory.length > 0 && onBack && (
          <button
            className="preview-panel__back-button"
            onClick={onBack}
            title="Back to previous asset"
          >
            ← Back
          </button>
        )}
        {!hideBreadcrumb && (
          <div className="preview-panel__breadcrumb">
            {navigationHistory.map((item, index) => (
              <React.Fragment key={index}>
                <span
                  className="preview-panel__breadcrumb-item"
                  onClick={() => {
                    const identifier = tryAssetIdentifier(item.path);
                    if (identifier && onNavigateToAsset) {
                      onNavigateToAsset(identifier);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const identifier = tryAssetIdentifier(item.path);
                      if (identifier && onNavigateToAsset) {
                        onNavigateToAsset(identifier);
                      }
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {item.name}
                </span>
                {index < navigationHistory.length - 1 && (
                  <span className="preview-panel__breadcrumb-separator">/</span>
                )}
              </React.Fragment>
            ))}
            {navigationHistory.length > 0 && (
              <span className="preview-panel__breadcrumb-separator">/</span>
            )}
            <span className="preview-panel__breadcrumb-item preview-panel__breadcrumb-item--current">
              {assetId}
            </span>
          </div>
        )}
        {toolbar ? (
          <div className="preview-panel__header-toolbar">
            {toolbar}
          </div>
        ) : null}
      </div>
      {!isNonAssetFile && (
        <div className="preview-panel__header-actions">
          <div className="preview-panel__tabs">
            <button
              className={`preview-panel__tab ${viewMode === 'preview' ? 'preview-panel__tab--active' : ''}`}
              onClick={() => setViewMode('preview')}
            >
              Preview
            </button>
            <button
              className={`preview-panel__tab ${viewMode === 'raw' ? 'preview-panel__tab--active' : ''}`}
              onClick={() => setViewMode('raw')}
            >
              Raw
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
