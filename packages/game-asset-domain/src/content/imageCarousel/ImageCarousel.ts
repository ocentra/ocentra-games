import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { ImageListEntry } from '../imageList/ImageList';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { generateAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import { BannerPlaybackMode, BannerTransitionType } from '@/constants/banner-presentation';
import type { BannerPlaybackModeValue, BannerTransitionTypeValue } from '@/constants/banner-presentation';
export interface CarouselAction {
  label: string;
  href?: string;
}

export interface CarouselSlide extends ImageListEntry {
  heading?: string;
  subheading?: string;
  action?: CarouselAction;
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'ImageCarousel',
  displayName: 'Image Carousel',
  icon: '🎞️',
  category: AssetTypeCategory.Content,
})
export class ImageCarousel extends ScriptableObject {

  static override schemaVersion = 1;
  static readonly requiresInspector = true;
  static override createTemplate(): Record<string, unknown> {
    return {
      slides: [],
      autoplayIntervalMs: 5000,
      lastImageDurationMs: 6000,
      fastRotationDurationMs: 2000,
      defaultRotationDurationMs: 3000,
      fastRotationThreshold: 4,
      slideTransitionDelayMs: 500,
      playbackMode: BannerPlaybackMode.PingPong,
      transitionType: BannerTransitionType.CrossDissolve,
      transitionDurationMs: 1500,
      logoImageHash: '',
      logoAlt: '',
      logoStartMs: 0,
      logoDurationMs: 1600,
      logoScaleFrom: 1,
      logoScaleTo: 1,
      logoOpacityFrom: 1,
      logoOpacityTo: 1,
      titleText: '',
      titleTextColor: '#ffffff',
      titleTextStartMs: 0,
      titleTextDurationMs: 1600,
      titleTextScaleFrom: 1,
      titleTextScaleTo: 1,
      titleTextOpacityFrom: 1,
      titleTextOpacityTo: 1,
      overlayTintColor: '',
      overlayTintOpacity: 0,
      vignetteOpacity: 0,
      fadeToBlackOpacity: 0,
    };
  }

  @serializable({ label: 'Slides' })
  slides!: CarouselSlide[];

  @serializable({ label: 'Autoplay Interval (ms)' })
  autoplayIntervalMs!: number;

  @serializable({ label: 'Last Image Duration (ms)' })
  lastImageDurationMs!: number;

  @serializable({ label: 'Fast Rotation Duration (ms)' })
  fastRotationDurationMs!: number;

  @serializable({ label: 'Default Rotation Duration (ms)' })
  defaultRotationDurationMs!: number;

  @serializable({ label: 'Fast Rotation Threshold' })
  fastRotationThreshold!: number;

  @serializable({ label: 'Slide Transition Delay (ms)' })
  slideTransitionDelayMs!: number;

  @serializable({ label: 'Playback Mode' })
  playbackMode!: BannerPlaybackModeValue;

  @serializable({ label: 'Transition Type' })
  transitionType!: BannerTransitionTypeValue;

  @serializable({ label: 'Transition Duration (ms)' })
  transitionDurationMs!: number;

  @serializable({ label: 'Logo Image Hash' })
  logoImageHash?: ImageHash;

  @serializable({ label: 'Logo Alt' })
  logoAlt?: string;

  @serializable({ label: 'Logo Start (ms)' })
  logoStartMs!: number;

  @serializable({ label: 'Logo Duration (ms)' })
  logoDurationMs!: number;

  @serializable({ label: 'Logo Scale From' })
  logoScaleFrom!: number;

  @serializable({ label: 'Logo Scale To' })
  logoScaleTo!: number;

  @serializable({ label: 'Logo Opacity From' })
  logoOpacityFrom!: number;

  @serializable({ label: 'Logo Opacity To' })
  logoOpacityTo!: number;

  @serializable({ label: 'Logo Visible From Frame' })
  logoVisibleFromIndex?: number;

  @serializable({ label: 'Logo Visible To Frame' })
  logoVisibleToIndex?: number;

  @serializable({ label: 'Title Text' })
  titleText?: string;

  @serializable({ label: 'Title Text Color' })
  titleTextColor?: string;

  @serializable({ label: 'Title Start (ms)' })
  titleTextStartMs!: number;

  @serializable({ label: 'Title Duration (ms)' })
  titleTextDurationMs!: number;

  @serializable({ label: 'Title Scale From' })
  titleTextScaleFrom!: number;

  @serializable({ label: 'Title Scale To' })
  titleTextScaleTo!: number;

  @serializable({ label: 'Title Opacity From' })
  titleTextOpacityFrom!: number;

  @serializable({ label: 'Title Opacity To' })
  titleTextOpacityTo!: number;

  @serializable({ label: 'Title Visible From Frame' })
  titleTextVisibleFromIndex?: number;

  @serializable({ label: 'Title Visible To Frame' })
  titleTextVisibleToIndex?: number;

  @serializable({ label: 'Overlay Tint Color' })
  overlayTintColor?: string;

  @serializable({ label: 'Overlay Tint Opacity' })
  overlayTintOpacity!: number;

  @serializable({ label: 'Vignette Opacity' })
  vignetteOpacity!: number;

  @serializable({ label: 'Fade To Black Opacity' })
  fadeToBlackOpacity!: number;

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const guid = await generateAssetGuid('ImageCarousel', context.gameId);
    const assetId = `${context.gameId}-carousel`;
    const data: Record<string, unknown> = {
      ...this.createTemplate(),
    };

    return {
      assetId,
      fileName: `${context.gameId}Carousel.asset`,
      guid,
      data,
    };
  }
}
