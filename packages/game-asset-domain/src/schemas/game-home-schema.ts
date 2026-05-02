import { schema } from '@ocentra/schema-domain/effect-builder';
import { BaseGameSchema } from '@/schemas/base-game-schema';
import { BannerPlaybackMode, BannerTransitionType } from '@/constants/banner-presentation';

export const GameHomeBadgeSchema = schema.object({
  label: schema.string(),
  tone: schema.string().optional(),
});

export const GameHomeSchema = BaseGameSchema.extend({
  comingSoon: schema.boolean().optional(),
  bannerImage: schema.string().optional(),
  carouselImages: schema.array(schema.string()).optional(),
  gameIcon: schema.string().optional(),
  tagline: schema.string().optional(),
  tagline2: schema.string().optional(),
  shortDescription: schema.string().optional(),
  description: schema.string().optional(),
  featuredTopBadges: schema.array(GameHomeBadgeSchema).optional(),
  featuredBottomBadges: schema.array(GameHomeBadgeSchema).optional(),
  textImageUrl: schema.string().optional(),
  minPlayers: schema.number().optional(),
  maxPlayers: schema.number().optional(),
  carouselLastImageDurationMs: schema.number().optional(),
  carouselFastRotationDurationMs: schema.number().optional(),
  carouselDefaultRotationDurationMs: schema.number().optional(),
  carouselFastRotationThreshold: schema.number().optional(),
  carouselSlideTransitionDelayMs: schema.number().optional(),
  carouselPlaybackMode: schema.nativeEnum(BannerPlaybackMode).optional(),
  carouselTransitionType: schema.nativeEnum(BannerTransitionType).optional(),
  carouselTransitionDurationMs: schema.number().optional(),
  bannerLogoImage: schema.string().optional(),
  bannerLogoAlt: schema.string().optional(),
  bannerLogoStartMs: schema.number().optional(),
  bannerLogoDurationMs: schema.number().optional(),
  bannerLogoScaleFrom: schema.number().optional(),
  bannerLogoScaleTo: schema.number().optional(),
  bannerLogoOpacityFrom: schema.number().optional(),
  bannerLogoOpacityTo: schema.number().optional(),
  bannerLogoVisibleFromIndex: schema.number().optional(),
  bannerLogoVisibleToIndex: schema.number().optional(),
  bannerTitleText: schema.string().optional(),
  bannerTitleColor: schema.string().optional(),
  bannerTitleStartMs: schema.number().optional(),
  bannerTitleDurationMs: schema.number().optional(),
  bannerTitleScaleFrom: schema.number().optional(),
  bannerTitleScaleTo: schema.number().optional(),
  bannerTitleOpacityFrom: schema.number().optional(),
  bannerTitleOpacityTo: schema.number().optional(),
  bannerTitleVisibleFromIndex: schema.number().optional(),
  bannerTitleVisibleToIndex: schema.number().optional(),
  bannerOverlayTintColor: schema.string().optional(),
  bannerOverlayTintOpacity: schema.number().optional(),
  bannerVignetteOpacity: schema.number().optional(),
  bannerFadeToBlackOpacity: schema.number().optional(),
  gameCategory: schema.string().optional(),
  subcategory: schema.string().nullable().optional(),
  difficulty: schema.string().optional(),
  duration: schema.string().optional(),
  deck: schema.string().optional(),
  playersDisplay: schema.string().optional(),
  quality: schema.string().optional(),
  completeness: schema.record(schema.string(), schema.boolean()).nullable().optional(),
});

export type GameHomeBadge = schema.infer<typeof GameHomeBadgeSchema>;
export type GameHome = schema.infer<typeof GameHomeSchema>;
export type FeaturedGameItem = GameHome;
