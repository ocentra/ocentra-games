import type { GamePoints, PositiveGamePoints } from './amounts.schema';
import type {
  GameId,
  IdempotencyKey,
  MatchId,
  PlayerId,
  UserId,
} from './ids.schema';

declare const gameId: GameId;
declare const idempotencyKey: IdempotencyKey;
declare const matchId: MatchId;
declare const playerId: PlayerId;
declare const positiveGamePoints: PositiveGamePoints;
declare const userId: UserId;

function requireGameId(value: GameId): GameId {
  return value;
}

function requireGamePoints(value: GamePoints): GamePoints {
  return value;
}

function requirePlayerId(value: PlayerId): PlayerId {
  return value;
}

requireGameId(gameId);
requireGamePoints(positiveGamePoints);
requirePlayerId(playerId);

// Values are referenced so branded declarations stay checked by TypeScript.
idempotencyKey satisfies IdempotencyKey;
matchId satisfies MatchId;
userId satisfies UserId;

// @ts-expect-error PlayerId must not be accepted where GameId is required.
requireGameId(playerId);

// @ts-expect-error UserId must not be accepted where PlayerId is required.
requirePlayerId(userId);

// @ts-expect-error Naked strings must be decoded before they become GameId values.
requireGameId('claim');

// @ts-expect-error Naked numbers must be decoded before they become GamePoints values.
requireGamePoints(27);
