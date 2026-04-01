import React from 'react';
import { EditorImageCache } from '@/lib/cache/EditorImageCache';
import { ImageVariant } from '@/lib/cache/editorImageTypes';
import { AssetLoader } from '@/adapters/assets/AssetLoader';
import '@/lib/core/inspector/InspectorPanel.css';

interface InspectorImagePreviewProps {
  imageHash: string | null;
  assetId: string;
}

export const InspectorImagePreview: React.FC<InspectorImagePreviewProps> = ({ imageHash, assetId }) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!imageHash) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const loadImage = async () => {
      try {
        const imageCache = EditorImageCache.getInstance();
        const cached = await imageCache.getCachedImageByHash(imageHash, ImageVariant.Full);
        if (cached && cached.blob) {
          setImageUrl(URL.createObjectURL(cached.blob));
          setIsLoading(false);
        } else {
          const loader = AssetLoader.getInstance();
          const url = await loader.resolveImageUrlByHash(imageHash);
          setImageUrl(url);
          setIsLoading(false);
        }
      } catch {
        setImageUrl(null);
        setIsLoading(false);
      }
    };
    loadImage();
  }, [imageHash]);

  if (!imageHash) {
    return <div className="inspector-panel__placeholder">No image hash available</div>;
  }

  if (isLoading) {
    return <div className="inspector-panel__placeholder">Loading image...</div>;
  }

  if (!imageUrl) {
    return <div className="inspector-panel__placeholder"><p>Failed to load image</p></div>;
  }

  return (
    <img
      src={imageUrl}
      alt={assetId}
      className="inspector-panel__image-full"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
        const container = (e.target as HTMLImageElement).parentElement;
        if (container) {
          container.innerHTML = '<div class="inspector-panel__placeholder"><p>Failed to load image</p></div>';
        }
      }}
    />
  );
};

