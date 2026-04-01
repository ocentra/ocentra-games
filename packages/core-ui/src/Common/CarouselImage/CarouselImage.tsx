import React from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

export interface CarouselImageProps {
  src: ImageHash;
  alt: string;
  className: string;
  resolveImageUrl: (hash: ImageHash) => string | null;
}

export const CarouselImage: React.FC<CarouselImageProps> = ({ src, alt, className, resolveImageUrl }) => {
  const imageUrl = resolveImageUrl(src);
  if (!imageUrl) {
    return <div className={`${className} image-loading-placeholder`} />;
  }
  return <img src={imageUrl} alt={alt} className={className} />;
};
