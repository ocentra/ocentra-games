import { BannerPlaybackMode } from '@ocentra/game-asset-domain/constants/banner-presentation';
import type { BannerPlaybackModeValue } from '@ocentra/game-asset-domain/constants/banner-presentation';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

export function getBannerPlaybackImages(
  images: ImageHash[],
  playbackMode?: BannerPlaybackModeValue,
): ImageHash[] {
  if (playbackMode !== BannerPlaybackMode.PingPong || images.length <= 1) {
    return images;
  }
  return [...images, ...images.slice(0, -1).reverse()];
}

export function getBannerPlaybackImageCount(count: number, playbackMode?: BannerPlaybackModeValue): number {
  if (playbackMode !== BannerPlaybackMode.PingPong || count <= 1) {
    return count;
  }
  return (count * 2) - 1;
}
