import { schema } from '@ocentra/schema-domain/effect-builder';
import { NoPlaceholdersValid } from '../shared/validation-guards';
import { BannerPlaybackMode, BannerTransitionType } from '@/constants/banner-presentation';

const ImageCarouselSlideSchema = schema.object({
    id: schema.string().min(1),
    label: schema.string().min(1).and(NoPlaceholdersValid).optional(),
    alt: schema.string().min(1).and(NoPlaceholdersValid),
    imageHash: schema.string()
});

export const ImageCarouselDataSchema = schema.object({
    slides: schema.array(ImageCarouselSlideSchema),
    autoplayIntervalMs: schema.number().int().min(1000).max(30000).optional(),
    lastImageDurationMs: schema.number().int().min(1000).optional(),
    fastRotationDurationMs: schema.number().int().min(250).optional(),
    defaultRotationDurationMs: schema.number().int().min(250).optional(),
    fastRotationThreshold: schema.number().int().min(1).optional(),
    slideTransitionDelayMs: schema.number().int().min(0).optional(),
    playbackMode: schema.nativeEnum(BannerPlaybackMode).optional(),
    transitionType: schema.nativeEnum(BannerTransitionType).optional(),
    transitionDurationMs: schema.number().int().min(0).optional(),
    logoImageHash: schema.string().optional(),
    logoAlt: schema.string().and(NoPlaceholdersValid).optional(),
    logoStartMs: schema.number().int().min(0).optional(),
    logoDurationMs: schema.number().int().min(0).optional(),
    logoScaleFrom: schema.number().min(0).optional(),
    logoScaleTo: schema.number().min(0).optional(),
    logoOpacityFrom: schema.number().min(0).max(1).optional(),
    logoOpacityTo: schema.number().min(0).max(1).optional(),
    logoVisibleFromIndex: schema.number().int().min(0).optional(),
    logoVisibleToIndex: schema.number().int().min(0).optional(),
    titleText: schema.string().and(NoPlaceholdersValid).optional(),
    titleTextColor: schema.string().optional(),
    titleTextStartMs: schema.number().int().min(0).optional(),
    titleTextDurationMs: schema.number().int().min(0).optional(),
    titleTextScaleFrom: schema.number().min(0).optional(),
    titleTextScaleTo: schema.number().min(0).optional(),
    titleTextOpacityFrom: schema.number().min(0).max(1).optional(),
    titleTextOpacityTo: schema.number().min(0).max(1).optional(),
    titleTextVisibleFromIndex: schema.number().int().min(0).optional(),
    titleTextVisibleToIndex: schema.number().int().min(0).optional(),
    overlayTintColor: schema.string().optional(),
    overlayTintOpacity: schema.number().min(0).max(1).optional(),
    vignetteOpacity: schema.number().min(0).max(1).optional(),
    fadeToBlackOpacity: schema.number().min(0).max(1).optional(),
}).passthrough();
