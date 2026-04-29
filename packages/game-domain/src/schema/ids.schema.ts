import * as Schema from 'effect/Schema';

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));

export const GameId = NonEmptyString.pipe(Schema.brand('GameId'));
export type GameId = typeof GameId.Type;

export const MechanicsId = NonEmptyString.pipe(Schema.brand('MechanicsId'));
export type MechanicsId = typeof MechanicsId.Type;

export const MechanicsVersion = NonEmptyString.pipe(Schema.brand('MechanicsVersion'));
export type MechanicsVersion = typeof MechanicsVersion.Type;

export const FamilyKernelId = NonEmptyString.pipe(Schema.brand('FamilyKernelId'));
export type FamilyKernelId = typeof FamilyKernelId.Type;

export const FamilyVariantId = NonEmptyString.pipe(Schema.brand('FamilyVariantId'));
export type FamilyVariantId = typeof FamilyVariantId.Type;

export const ExecutorId = NonEmptyString.pipe(Schema.brand('ExecutorId'));
export type ExecutorId = typeof ExecutorId.Type;

export const RuleId = NonEmptyString.pipe(Schema.brand('RuleId'));
export type RuleId = typeof RuleId.Type;

export const ScoringProfileId = NonEmptyString.pipe(Schema.brand('ScoringProfileId'));
export type ScoringProfileId = typeof ScoringProfileId.Type;

export const StrategyProfileId = NonEmptyString.pipe(Schema.brand('StrategyProfileId'));
export type StrategyProfileId = typeof StrategyProfileId.Type;

export const PhaseId = NonEmptyString.pipe(Schema.brand('PhaseId'));
export type PhaseId = typeof PhaseId.Type;

export const ActionId = NonEmptyString.pipe(Schema.brand('ActionId'));
export type ActionId = typeof ActionId.Type;

export const ZoneId = NonEmptyString.pipe(Schema.brand('ZoneId'));
export type ZoneId = typeof ZoneId.Type;

export const PlayerId = NonEmptyString.pipe(Schema.brand('PlayerId'));
export type PlayerId = typeof PlayerId.Type;

export const CardId = NonEmptyString.pipe(Schema.brand('CardId'));
export type CardId = typeof CardId.Type;

export const SuitId = NonEmptyString.pipe(Schema.brand('SuitId'));
export type SuitId = typeof SuitId.Type;

export const decodeGameId = Schema.decodeUnknownSync(GameId);
export const decodeMechanicsId = Schema.decodeUnknownSync(MechanicsId);
export const decodeMechanicsVersion = Schema.decodeUnknownSync(MechanicsVersion);
export const decodeExecutorId = Schema.decodeUnknownSync(ExecutorId);
export const decodeRuleId = Schema.decodeUnknownSync(RuleId);
export const decodeScoringProfileId = Schema.decodeUnknownSync(ScoringProfileId);
export const decodeStrategyProfileId = Schema.decodeUnknownSync(StrategyProfileId);
export const decodePhaseId = Schema.decodeUnknownSync(PhaseId);
export const decodeActionId = Schema.decodeUnknownSync(ActionId);
export const decodeZoneId = Schema.decodeUnknownSync(ZoneId);
export const decodePlayerId = Schema.decodeUnknownSync(PlayerId);
export const decodeCardId = Schema.decodeUnknownSync(CardId);
export const decodeSuitId = Schema.decodeUnknownSync(SuitId);
