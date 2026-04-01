import { useEffect, useRef } from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { useImageUrl } from '@/hooks/useImageUrl';

export function ResolveImageUrlLoader({
  hash,
  onLoad,
}: {
  hash: ImageHash;
  onLoad: (url: string | null) => void;
}) {
  const { imageUrl } = useImageUrl(hash);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  useEffect(() => {
    onLoadRef.current(imageUrl);
  }, [imageUrl]);
  return null;
}
