import { getProxiedImageUrl } from '@/utils/imageProxy';

export function getHeaderAvatarUrl(photoUrl: string | null | undefined): string | undefined {
  const normalizedUrl = photoUrl?.trim();
  return normalizedUrl ? getProxiedImageUrl(normalizedUrl) : undefined;
}
