import React, { useState, useEffect } from 'react';
import { Resources } from '@ocentra/asset-domain/resources/Resources';
import type { ImageListEntry } from '@ocentra/game-asset-domain/content/imageList/ImageList';
import './ImageListPreview.css';

interface ImageListPreviewProps {
  images: ImageListEntry[];
  assetId: string;
}

export const ImageListPreview: React.FC<ImageListPreviewProps> = ({ images }) => {
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const loadUrls = async () => {
      const urlMap = new Map<number, string>();
      await Promise.all(images.map(async (image, index) => {
        try {
          const url = await Resources.getUrl(image.imageHash);
          if (url) {
            urlMap.set(index, url);
          }
        } catch {
          // Don't set empty string - skip this image
        }
      }));
      setImageUrls(urlMap);
    };
    if (images.length > 0) {
      loadUrls();
    }
  }, [images]);
  if (!images || images.length === 0) {
    return (
      <div className="preview-panel">
        <div className="preview-panel__content preview-panel__content--image-list">
          <div className="preview-panel__placeholder">No images available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel">
      <div className="preview-panel__content preview-panel__content--image-list">
        <div className="image-list-preview">
          <div className="image-list-preview__grid">
            {images.map((image, index) => {
              const imageUrl = imageUrls.get(index);
              if (!imageUrl) return null;
              return (
                <div key={index} className="image-list-preview__item">
                  <div className="image-list-preview__image-container">
                    <img
                      src={imageUrl}
                      alt={image.alt || image.label || image.id}
                      className="image-list-preview__image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  {(image.label || image.description) && (
                    <div className="image-list-preview__content">
                      {image.label && (
                        <div className="image-list-preview__label">{image.label}</div>
                      )}
                      {image.description && (
                        <div className="image-list-preview__description">{image.description}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

