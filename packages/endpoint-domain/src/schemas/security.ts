import { z } from 'zod';

export const SecurityEventSeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);
export const SecurityEventCategorySchema = z.enum(['auth', 'access', 'fraud', 'cheat', 'abuse', 'anomaly', 'system']);
export const SecurityActorTypeSchema = z.enum(['user', 'ip', 'device', 'system']);
export const SecurityActionResultSchema = z.enum(['allowed', 'blocked', 'flagged', 'error']);
export const SecurityDetectionMethodSchema = z.enum(['rule', 'ml', 'heuristic', 'manual', 'report']);
export const SecurityResponseActionSchema = z.enum(['none', 'logged', 'rate_limited', 'blocked', 'banned']);

const GeolocationSchema = z.object({
  country: z.string(),
  region: z.string().optional(),
  city: z.string().optional(),
}).optional();

const ActorSchema = z.object({
  type: SecurityActorTypeSchema,
  id: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  geolocation: GeolocationSchema,
});

const ActionSchema = z.object({
  type: z.string(),
  target: z.string(),
  result: SecurityActionResultSchema,
  details: z.record(z.unknown()).optional(),
});

const DetectionSchema = z.object({
  method: SecurityDetectionMethodSchema,
  confidence: z.number().min(0).max(1),
  ruleId: z.string().optional(),
  modelVersion: z.string().optional(),
});

const ResponseSchema = z.object({
  actionTaken: SecurityResponseActionSchema,
  automated: z.boolean(),
  reviewedBy: z.string().optional(),
  reviewNotes: z.string().optional(),
});

export const SecurityEventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.number(),
  severity: SecurityEventSeveritySchema,
  category: SecurityEventCategorySchema,
  actor: ActorSchema,
  action: ActionSchema,
  detection: DetectionSchema,
  response: ResponseSchema,
});
