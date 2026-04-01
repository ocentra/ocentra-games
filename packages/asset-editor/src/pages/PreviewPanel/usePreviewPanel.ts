import { useState, useEffect } from 'react';
import type { ViewMode } from './types';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { tryAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';

interface UsePreviewPanelProps {
  assetPath: string | null;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
}

export function usePreviewPanel({
  assetPath,
  onNavigateToAsset,
}: UsePreviewPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  useEffect(() => {
    setViewMode('preview');
  }, [assetPath]);

  useEffect(() => {
    if (!onNavigateToAsset) return;

    const handleAssetLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('asset-link')) {
        e.preventDefault();
        const guid = target.getAttribute('data-asset-guid');
        const assetId = target.getAttribute('data-asset-id');
        
        if (guid) {
          const identifier = tryAssetIdentifier(guid);
          if (identifier && onNavigateToAsset) {
            onNavigateToAsset(identifier);
          }
        } else if (assetId) {
          const identifier = tryAssetIdentifier(assetId);
          if (identifier && onNavigateToAsset) {
            onNavigateToAsset(identifier);
          }
        }
      }
    };

    document.addEventListener('click', handleAssetLinkClick);
    return () => document.removeEventListener('click', handleAssetLinkClick);
  }, [onNavigateToAsset]);

  return {
    viewMode,
    setViewMode,
  };
}

