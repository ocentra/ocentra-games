import React from 'react';
import { useImageUrl } from '@/hooks/useImageUrl';
import { ImageVariant } from '@/lib/cache/editorImageTypes';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { MetaData } from '@ocentra/eventing-domain/types/meta';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import './PreviewPanel.css';

const LOG_IMAGE_SELECTION = false;

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

interface ImagePreviewProps {
  imageGuidOrHash: string | null;
  assetId: string;
  meta?: MetaData;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ imageGuidOrHash, assetId, meta }) => {
  const imageIdentifier = React.useMemo(() => {
    if (!imageGuidOrHash) return null;
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageGuidOrHash);
    const isHash = /^[a-f0-9]{64}$/i.test(imageGuidOrHash);
    if (isGuid || isHash) {
      return imageGuidOrHash;
    }
    return null;
  }, [imageGuidOrHash]);

  React.useEffect(() => {
    if (LOG_IMAGE_SELECTION && imageIdentifier) {
      log.logInfo('[ImagePreview] Component mounted/updated', getStackTrace(), {
        imageGuidOrHash,
        imageIdentifier,
        assetId,
        variant: ImageVariant.Full,
        hasMeta: !!meta,
      });
    }
  }, [imageGuidOrHash, imageIdentifier, assetId, meta]);

  const { imageUrl, isLoading } = useImageUrl(imageIdentifier as unknown as ImageHash | null, {
    meta,
    variant: ImageVariant.Full
  });

  if (isLoading) {
    return (
      <div className="preview-panel">
        <div className="preview-panel__header">
          <h3>Preview</h3>
        </div>
        <div className="preview-panel__content preview-panel__content--image">
          <div className="preview-panel__placeholder">Loading image...</div>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="preview-panel">
        <div className="preview-panel__header">
          <h3>Preview</h3>
        </div>
        <div className="preview-panel__content preview-panel__content--image">
          <div className="preview-panel__placeholder">
            <p>Failed to load image</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel">
      <div className="preview-panel__header">
        <h3>Preview</h3>
      </div>
      <div className="preview-panel__content preview-panel__content--image">
        <div className="preview-panel__image-container">
          <img
            src={imageUrl}
            alt={assetId}
            className="preview-panel__image"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const container = (e.target as HTMLImageElement).parentElement;
              if (container) {
                container.innerHTML = `<div class="preview-panel__placeholder"><p>Failed to load image</p></div>`;
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

