import { z } from 'zod';
import { BaseGameSchema } from '@/schemas/base-game-schema';

export const GameHomeSchema = BaseGameSchema.extend({
  comingSoon: z.boolean().optional(),
  bannerImage: z.string().optional(),
  carouselImages: z.array(z.string()).optional(),
  gameIcon: z.string().optional(),
  tagline: z.string().optional(),
  tagline2: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  textImageUrl: z.string().optional(),
  minPlayers: z.number().optional(),
  maxPlayers: z.number().optional(),
  carouselLastImageDurationMs: z.number().optional(),
  carouselFastRotationDurationMs: z.number().optional(),
  carouselDefaultRotationDurationMs: z.number().optional(),
  carouselFastRotationThreshold: z.number().optional(),
  carouselSlideTransitionDelayMs: z.number().optional(),
  gameCategory: z.string().optional(),
  subcategory: z.string().nullable().optional(),
  difficulty: z.string().optional(),
  duration: z.string().optional(),
  deck: z.string().optional(),
  playersDisplay: z.string().optional(),
  quality: z.string().optional(),
  completeness: z.record(z.string(), z.boolean()).nullable().optional(),
});

export type GameHome = z.infer<typeof GameHomeSchema>;
export type FeaturedGameItem = GameHome;
