import { schema } from '@ocentra/schema-domain/effect-builder';
import { UUIDSchema } from './common';

export const AuditActorSchema = schema.object({
  type: schema.enum(['user', 'system', 'ai', 'admin']),
  id: schema.string(),
  ip: schema.string().optional(),
  userAgent: schema.string().optional(),
  sessionId: schema.string().optional(),
});

export const AuditTargetSchema = schema.object({
  type: schema.string(),
  id: schema.string(),
  resource: schema.string().optional(),
});

export const AuditActionSchema = schema.object({
  type: schema.string(),
  status: schema.enum(['success', 'failure', 'attempt']),
  details: schema.record(schema.unknown()).optional(),
});

export const AuditContextSchema = schema.object({
  timestamp: schema.number(),
  timezone: schema.string().optional(),
  region: schema.string().optional(),
  requestId: schema.string().optional(),
  traceId: schema.string().optional(),
});

export const AuditClassificationSchema = schema.object({
  sensitivity: schema.string().optional(),
  retention: schema.string().optional(),
  piiFields: schema.array(schema.string()).optional(),
  complianceFlags: schema.array(schema.string()).optional(),
});

export const AuditIntegritySchema = schema.object({
  previousHash: schema.string().optional(),
  currentHash: schema.string(),
  signature: schema.string().optional(),
  chainId: schema.string().optional(),
});

export const AuditEventSchema = schema.object({
  eventId: UUIDSchema,
  eventType: schema.string(),
  category: schema.string(),
  version: schema.string().optional(),
  actor: AuditActorSchema,
  target: AuditTargetSchema,
  action: AuditActionSchema,
  context: AuditContextSchema,
  classification: AuditClassificationSchema.optional(),
  integrity: AuditIntegritySchema.optional(),
});

export type AuditEvent = schema.infer<typeof AuditEventSchema>;
export type AuditIntegrity = schema.infer<typeof AuditIntegritySchema>;

export const AuditQueryFiltersSchema = schema.object({
  actorId: schema.string().optional(),
  category: schema.string().optional(),
  startTime: schema.number().optional(),
  endTime: schema.number().optional(),
  targetId: schema.string().optional(),
  limit: schema.number().min(1).max(500).optional(),
  cursor: schema.string().optional(),
});

export type AuditQueryFilters = schema.infer<typeof AuditQueryFiltersSchema>;
