import * as Schema from 'effect/Schema';

const Integer = Schema.Number.pipe(Schema.int());
const NonNegativeInteger = Integer.pipe(Schema.nonNegative());
const PositiveInteger = Integer.pipe(Schema.positive());

export const GamePoints = Integer.pipe(Schema.brand('GamePoints'));
export type GamePoints = typeof GamePoints.Type;

export const PositiveGamePoints = PositiveInteger.pipe(Schema.brand('GamePoints'), Schema.brand('PositiveGamePoints'));
export type PositiveGamePoints = typeof PositiveGamePoints.Type;

export const AICredits = NonNegativeInteger.pipe(Schema.brand('AICredits'));
export type AICredits = typeof AICredits.Type;

export const PositiveAICredits = PositiveInteger.pipe(Schema.brand('AICredits'), Schema.brand('PositiveAICredits'));
export type PositiveAICredits = typeof PositiveAICredits.Type;

export const TokenCount = NonNegativeInteger.pipe(Schema.brand('TokenCount'));
export type TokenCount = typeof TokenCount.Type;

export const UsdCents = NonNegativeInteger.pipe(Schema.brand('UsdCents'));
export type UsdCents = typeof UsdCents.Type;

export const LedgerVersion = NonNegativeInteger.pipe(Schema.brand('LedgerVersion'));
export type LedgerVersion = typeof LedgerVersion.Type;

export const RankValue = PositiveInteger.pipe(Schema.brand('RankValue'));
export type RankValue = typeof RankValue.Type;

export const RoundNumber = PositiveInteger.pipe(Schema.brand('RoundNumber'));
export type RoundNumber = typeof RoundNumber.Type;

export const TimerSeconds = NonNegativeInteger.pipe(Schema.brand('TimerSeconds'));
export type TimerSeconds = typeof TimerSeconds.Type;

export const HandSize = NonNegativeInteger.pipe(Schema.brand('HandSize'));
export type HandSize = typeof HandSize.Type;

export const PositiveHandSize = PositiveInteger.pipe(Schema.brand('HandSize'), Schema.brand('PositiveHandSize'));
export type PositiveHandSize = typeof PositiveHandSize.Type;

export const Bankroll = Integer.pipe(Schema.brand('Bankroll'));
export type Bankroll = typeof Bankroll.Type;

export const PositiveBankrollDelta = PositiveInteger.pipe(Schema.brand('PositiveBankrollDelta'));
export type PositiveBankrollDelta = typeof PositiveBankrollDelta.Type;

export const decodeGamePoints = Schema.decodeUnknownSync(GamePoints);
export const decodePositiveGamePoints = Schema.decodeUnknownSync(PositiveGamePoints);
export const decodeAICredits = Schema.decodeUnknownSync(AICredits);
export const decodePositiveAICredits = Schema.decodeUnknownSync(PositiveAICredits);
export const decodeTokenCount = Schema.decodeUnknownSync(TokenCount);
export const decodeUsdCents = Schema.decodeUnknownSync(UsdCents);
export const decodeLedgerVersion = Schema.decodeUnknownSync(LedgerVersion);
export const decodeRankValue = Schema.decodeUnknownSync(RankValue);
export const decodeRoundNumber = Schema.decodeUnknownSync(RoundNumber);
export const decodeTimerSeconds = Schema.decodeUnknownSync(TimerSeconds);
export const decodeHandSize = Schema.decodeUnknownSync(HandSize);
export const decodePositiveHandSize = Schema.decodeUnknownSync(PositiveHandSize);
export const decodeBankroll = Schema.decodeUnknownSync(Bankroll);
export const decodePositiveBankrollDelta = Schema.decodeUnknownSync(PositiveBankrollDelta);
