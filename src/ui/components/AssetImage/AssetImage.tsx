import React, { useEffect, useMemo, useState } from 'react';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import { isAssetGUID, isImageHash, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { AssetLoader } from '@/adapters/assets/AssetLoader';
import { useImageUrl } from '@/hooks/useImageUrl';
import './AssetImage.css';

export interface AssetImageProps {
  assetRef: string | AssetReference | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  priority?: number;
}

export const AssetImage: React.FC<AssetImageProps> = ({
  assetRef,
  alt,
  className = '',
  fallbackSrc,
  loading = 'lazy',
  priority = 0,
}) => {
  const normalizedAssetRef = useMemo(() => {
    if (!assetRef) return null;
    if (typeof assetRef === 'string') return assetRef.trim() || null;
    return assetRef.guid?.trim() || null;
  }, [assetRef]);

  const imageHash = normalizedAssetRef && isImageHash(normalizedAssetRef)
    ? normalizedAssetRef
    : null;
  const guid = normalizedAssetRef && isAssetGUID(normalizedAssetRef)
    ? normalizedAssetRef
    : null;
  const directPath = normalizedAssetRef && !imageHash && !guid
    ? (normalizedAssetRef.startsWith('/') ? normalizedAssetRef : `/${normalizedAssetRef}`)
    : null;

  const { imageUrl: hashImageUrl, isLoading: isHashLoading, error: hashError } = useImageUrl(
    imageHash as ImageHash | null,
    {
      priority,
      enabled: !!imageHash,
    }
  );

  const [resolvedAssetUrl, setResolvedAssetUrl] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<Error | null>(null);

  useEffect(() => {
    if (directPath) {
      setResolvedAssetUrl(directPath);
      setAssetError(null);
      return;
    }

    if (!guid) {
      setResolvedAssetUrl(null);
      setAssetError(null);
      return;
    }

    let isActive = true;
    let objectUrl: string | null = null;

    setResolvedAssetUrl(null);
    setAssetError(null);

    void AssetLoader.getInstance()
      .resolveAssetUrlByGuid(guid)
      .then((url) => {
        objectUrl = url;
        if (!isActive) {
          URL.revokeObjectURL(url);
          return;
        }
        setResolvedAssetUrl(url);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setAssetError(error instanceof Error ? error : new Error(String(error)));
      });

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [directPath, guid]);

  const imageUrl = imageHash ? hashImageUrl : resolvedAssetUrl;
  const isLoading = imageHash ? isHashLoading : !!guid && !resolvedAssetUrl && !assetError;
  const error = imageHash ? hashError : assetError;

  if (isLoading) {
    return (
      <div className={`asset-image asset-image--loading ${className}`}>
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !imageUrl) {
    if (fallbackSrc) {
      return <img src={fallbackSrc} alt={alt || ''} className={className} />;
    }
    return (
      <div className={`asset-image asset-image--error ${className}`}>
        <span>Image not available</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || ''}
      className={`asset-image ${className}`}
      loading={loading}
    />
  );
};

export default AssetImage;
