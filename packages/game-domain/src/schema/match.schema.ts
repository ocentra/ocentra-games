import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import type { PlayerAction } from '@/types/game';
import * as Schema from 'effect/Schema';
import { ClaimSuitSchema } from './claim.schema';
import { ActionId, CardId, PlayerId } from './ids.schema';

const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown });

export const PlayerActionTimestampSchema = Schema.Union(
  Schema.ValidDateFromSelf,
  Schema.Date,
);
export type PlayerActionTimestamp = typeof PlayerActionTimestampSchema.Type;

export const GenericPlayerActionSchema = Schema.asSchema(
  Schema.Struct({
    type: ActionId,
    playerId: PlayerId,
    data: Schema.optional(Schema.Unknown),
    timestamp: PlayerActionTimestampSchema,
  }).pipe(Schema.extend(UnknownRecord)),
);
export type GenericPlayerAction = typeof GenericPlayerActionSchema.Type;

const EmptyClaimPayloadSchema = Schema.optional(Schema.Unknown);

const ClaimActionBaseSchema = Schema.Struct({
  playerId: PlayerId,
  timestamp: PlayerActionTimestampSchema,
});

const ClaimNoPayloadActionSchema = Schema.Union(
  Schema.Struct({ type: Schema.Literal('take_stock'), data: EmptyClaimPayloadSchema }).pipe(Schema.extend(ClaimActionBaseSchema)),
  Schema.Struct({ type: Schema.Literal('take_discard'), data: EmptyClaimPayloadSchema }).pipe(Schema.extend(ClaimActionBaseSchema)),
  Schema.Struct({ type: Schema.Literal('end_turn'), data: EmptyClaimPayloadSchema }).pipe(Schema.extend(ClaimActionBaseSchema)),
  Schema.Struct({ type: Schema.Literal('timeout_turn'), data: EmptyClaimPayloadSchema }).pipe(Schema.extend(ClaimActionBaseSchema)),
  Schema.Struct({ type: Schema.Literal('call_showdown'), data: EmptyClaimPayloadSchema }).pipe(Schema.extend(ClaimActionBaseSchema)),
  Schema.Struct({ type: Schema.Literal('pass'), data: EmptyClaimPayloadSchema }).pipe(Schema.extend(ClaimActionBaseSchema)),
);

const ClaimDeclarePayloadSchema = Schema.Struct({
  suit: ClaimSuitSchema,
}).pipe(Schema.extend(UnknownRecord));

const ClaimDiscardPayloadSchema = Schema.Struct({
  cardId: CardId,
}).pipe(Schema.extend(UnknownRecord));

export const ClaimPlayerActionSchema = Schema.Union(
  ClaimNoPayloadActionSchema,
  Schema.Struct({
    type: Schema.Literal('declare_suit'),
    data: ClaimDeclarePayloadSchema,
  }).pipe(Schema.extend(ClaimActionBaseSchema)),
  Schema.Struct({
    type: Schema.Literal('declare'),
    data: ClaimDeclarePayloadSchema,
  }).pipe(Schema.extend(ClaimActionBaseSchema)),
  Schema.Struct({
    type: Schema.Literal('discard_card'),
    data: ClaimDiscardPayloadSchema,
  }).pipe(Schema.extend(ClaimActionBaseSchema)),
);
export type ClaimPlayerAction = typeof ClaimPlayerActionSchema.Type;

export const decodeGenericPlayerActionEither = Schema.decodeUnknownEither(GenericPlayerActionSchema);
export const encodeGenericPlayerActionEither = Schema.encodeEither(GenericPlayerActionSchema);
export const decodeClaimPlayerActionEither = Schema.decodeUnknownEither(ClaimPlayerActionSchema);
export const encodeClaimPlayerActionEither = Schema.encodeEither(ClaimPlayerActionSchema);

export function decodeGenericPlayerAction(input: unknown): PlayerAction {
  return decodedActionToPlayerAction(Schema.decodeUnknownSync(GenericPlayerActionSchema)(input));
}

export function decodeMechanicsPlayerAction(spec: MechanicsSpec, input: unknown): PlayerAction {
  const decoded = spec.familyKernel === 'claim'
    ? Schema.decodeUnknownSync(ClaimPlayerActionSchema)(input)
    : Schema.decodeUnknownSync(GenericPlayerActionSchema)(input);
  return decodedActionToPlayerAction(decoded);
}

function decodedActionToPlayerAction(decoded: ClaimPlayerAction | GenericPlayerAction): PlayerAction {
  const action: PlayerAction = {
    playerId: decoded.playerId,
    timestamp: decoded.timestamp,
    type: decoded.type,
  };

  if ('data' in decoded && decoded.data !== undefined) {
    action.data = decoded.data;
  }

  return action;
}
