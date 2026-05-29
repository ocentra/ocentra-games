import { schema } from '@ocentra/schema-domain/effect-builder';
import { GameModeStatus } from '@/constants/game-mode-status';

const GameModeStatusSchema = schema.nativeEnum(GameModeStatus);

export const BaseGameSchema = schema.object({
  gameId: schema.string(),
  guid: schema.string(),
  name: schema.string(),
  enabled: schema.boolean(),
  releaseStatus: GameModeStatusSchema.optional(),
  tags: schema.array(schema.string()).optional(),
});

export type BaseGame = schema.infer<typeof BaseGameSchema>;
