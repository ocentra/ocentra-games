import { schema } from '@ocentra/schema-domain/effect-builder';

export const SecurityEventSeveritySchema = schema.enum(['info', 'low', 'medium', 'high', 'critical']);
export const SecurityEventCategorySchema = schema.enum(['auth', 'access', 'fraud', 'cheat', 'abuse', 'anomaly', 'system']);
export const SecurityActorTypeSchema = schema.enum(['user', 'ip', 'device', 'system']);
export const SecurityActionResultSchema = schema.enum(['allowed', 'blocked', 'flagged', 'error']);
export const SecurityDetectionMethodSchema = schema.enum(['rule', 'ml', 'heuristic', 'manual', 'report']);
export const SecurityResponseActionSchema = schema.enum(['none', 'logged', 'rate_limited', 'blocked', 'banned']);

const GeolocationSchema = schema.object({
  country: schema.string(),
  region: schema.string().optional(),
  city: schema.string().optional(),
}).optional();

const ActorSchema = schema.object({
  type: SecurityActorTypeSchema,
  id: schema.string(),
  ip: schema.string().optional(),
  userAgent: schema.string().optional(),
  geolocation: GeolocationSchema,
});

const ActionSchema = schema.object({
  type: schema.string(),
  target: schema.string(),
  result: SecurityActionResultSchema,
  details: schema.record(schema.unknown()).optional(),
});

const DetectionSchema = schema.object({
  method: SecurityDetectionMethodSchema,
  confidence: schema.number().min(0).max(1),
  ruleId: schema.string().optional(),
  modelVersion: schema.string().optional(),
});

const ResponseSchema = schema.object({
  actionTaken: SecurityResponseActionSchema,
  automated: schema.boolean(),
  reviewedBy: schema.string().optional(),
  reviewNotes: schema.string().optional(),
});

export const SecurityEventSchema = schema.object({
  eventId: schema.string().uuid(),
  timestamp: schema.number(),
  severity: SecurityEventSeveritySchema,
  category: SecurityEventCategorySchema,
  actor: ActorSchema,
  action: ActionSchema,
  detection: DetectionSchema,
  response: ResponseSchema,
});
