import { TimeInMs } from '@/constants/time';

export const AIEventType = {
  MatchStart: 'match_start',
  MoveSubmitted: 'move_submitted',
  StateUpdate: 'state_update',
  MatchEnd: 'match_end',
} as const;

export type AIEventType = typeof AIEventType[keyof typeof AIEventType];

export const AIActionType = {
  Decline: 'decline',
} as const;

export type AIActionType = typeof AIActionType[keyof typeof AIActionType];

export const AIModelProvider = {
  Local: 'local',
} as const;

export type AIModelProvider = typeof AIModelProvider[keyof typeof AIModelProvider];

export const AIModelId = {
  Default: 'default',
} as const;

export type AIModelId = typeof AIModelId[keyof typeof AIModelId];

export const AIAllowedDomains = {
  OpenAI: 'api.openai.com',
  Anthropic: 'api.anthropic.com',
} as const;

export type AIAllowedDomains = typeof AIAllowedDomains[keyof typeof AIAllowedDomains];

export const AIRateLimit = {
  DefaultLimit: 20,
  DefaultWindowMs: TimeInMs.Minute,
  TestLimit: 10000,
} as const;

export type AIRateLimit = typeof AIRateLimit[keyof typeof AIRateLimit];

export const AIRequestLimits = {
  MaxSizeBytes: 1024 * 1024,
} as const;

export type AIRequestLimits = typeof AIRequestLimits[keyof typeof AIRequestLimits];

