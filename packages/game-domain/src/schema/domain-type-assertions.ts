import type { GamePoints, PositiveGamePoints } from './amounts.schema';
import type { GameId, PlayerId } from './ids.schema';

declare const gameId: GameId;
declare const playerId: PlayerId;
declare const positiveGamePoints: PositiveGamePoints;

function requireGameId(value: GameId): GameId {
  return value;
}

function requireGamePoints(value: GamePoints): GamePoints {
  return value;
}

requireGameId(gameId);
requireGamePoints(positiveGamePoints);

// @ts-expect-error PlayerId must not be accepted where GameId is required.
requireGameId(playerId);

// @ts-expect-error Naked strings must be decoded before they become GameId values.
requireGameId('claim');

// @ts-expect-error Naked numbers must be decoded before they become GamePoints values.
requireGamePoints(27);
