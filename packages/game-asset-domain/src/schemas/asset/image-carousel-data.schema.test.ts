import { describe, expect, it } from 'vitest';
import { BannerPlaybackMode, BannerTransitionType } from '@/constants/banner-presentation';
import { ImageCarouselDataSchema } from '@/schemas/asset/image-carousel-data.schema';

describe('ImageCarouselDataSchema', () => {
  const slides = [
    {
      id: 'claim-0',
      label: 'Claim base frame 0',
      alt: 'Claim forest base frame 0',
      imageHash: '23e8763b176610264a511e41ba20e8fcdfa797daf6c6554cf517de5c04fce70d',
    },
  ];

  it('accepts runtime banner composition fields', () => {
    const parsed = ImageCarouselDataSchema.parse({
      slides,
      playbackMode: BannerPlaybackMode.PingPong,
      transitionType: BannerTransitionType.CrossDissolve,
      transitionDurationMs: 1500,
      logoImageHash: 'c97123f08cc2fc960ef9cbd3b70134067029ec081a112951407871cf6fa29de5',
      logoAlt: 'Claim',
      logoStartMs: 1600,
      logoDurationMs: 1800,
      logoScaleFrom: 0.92,
      logoScaleTo: 1,
      logoOpacityFrom: 0,
      logoOpacityTo: 1,
      logoVisibleFromIndex: 8,
      logoVisibleToIndex: 16,
      titleText: 'Claim',
      titleTextColor: '#f6f2df',
      titleTextStartMs: 1600,
      titleTextDurationMs: 1800,
      titleTextScaleFrom: 0.92,
      titleTextScaleTo: 1,
      titleTextOpacityFrom: 0,
      titleTextOpacityTo: 1,
      titleTextVisibleFromIndex: 8,
      titleTextVisibleToIndex: 16,
      overlayTintColor: '#1f4d2b',
      overlayTintOpacity: 0.28,
      vignetteOpacity: 0.78,
      fadeToBlackOpacity: 0.22,
    });

    expect(parsed.playbackMode).toBe(BannerPlaybackMode.PingPong);
    expect(parsed.transitionType).toBe(BannerTransitionType.CrossDissolve);
    expect(parsed.logoImageHash).toBe('c97123f08cc2fc960ef9cbd3b70134067029ec081a112951407871cf6fa29de5');
    expect(parsed.logoVisibleFromIndex).toBe(8);
    expect(parsed.titleText).toBe('Claim');
    expect(parsed.titleTextVisibleToIndex).toBe(16);
    expect(parsed.overlayTintOpacity).toBe(0.28);
  });

  it('rejects composition opacity outside the visible range', () => {
    expect(() => ImageCarouselDataSchema.parse({
      slides,
      overlayTintOpacity: 1.2,
    })).toThrow();
  });
});
