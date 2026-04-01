import React, { useState, useEffect, useRef } from 'react';
import spinnerUrl from './spinner.svg';

interface ImageThumbnailProps {
  path: string;
  name: string;
  imageUrl: string | null;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = React.memo(({ path, name, imageUrl }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [path, imageUrl]);

  if (imageUrl === null) {
    return <span className="resource-tree__icon">📎</span>;
  }

  if (hasError) {
    return <span className="resource-tree__icon">📎</span>;
  }

  const displayUrl = imageUrl || spinnerUrl;

  return (
    <span className="resource-tree__icon resource-tree__icon--thumbnail">
      <img 
        ref={imgRef}
        src={displayUrl} 
        alt={name}
        className="resource-tree__thumbnail-image"
        onError={() => {
          if (imageUrl) {
            setHasError(true);
          }
        }}
      />
    </span>
  );
}, (prev, next) => prev.path === next.path && prev.imageUrl === next.imageUrl);

ImageThumbnail.displayName = 'ImageThumbnail';

