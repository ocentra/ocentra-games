import React from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

export interface GameBannerImageProps {
  src: ImageHash;
  alt: string;
  className: string;
  resolveImageUrl: (hash: ImageHash) => string | null;
}

export const GameBannerImage: React.FC<GameBannerImageProps> = ({ src, alt, className, resolveImageUrl }) => {
  const imageUrl = resolveImageUrl(src);
  if (!imageUrl) return null;
  return <img src={imageUrl} alt={alt} className={className} />;
};
