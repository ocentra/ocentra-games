import { z } from 'zod';
import { GameModeStatus } from '@/constants/game-mode-status';

const GameModeStatusSchema = z.enum([
  GameModeStatus.Available,
  GameModeStatus.ComingSoon,
  GameModeStatus.Maintenance,
  GameModeStatus.Deprecated,
]);

export const BaseGameSchema = z.object({
  gameId: z.string(),
  guid: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  releaseStatus: GameModeStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export type BaseGame = z.infer<typeof BaseGameSchema>;
