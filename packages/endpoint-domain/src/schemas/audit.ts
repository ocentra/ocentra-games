import { z } from 'zod';
import { UUIDSchema } from './common';

export const AuditActorSchema = z.object({
  type: z.enum(['user', 'system', 'ai', 'admin']),
  id: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
});

export const AuditTargetSchema = z.object({
  type: z.string(),
  id: z.string(),
  resource: z.string().optional(),
});

export const AuditActionSchema = z.object({
  type: z.string(),
  status: z.enum(['success', 'failure', 'attempt']),
  details: z.record(z.unknown()).optional(),
});

export const AuditContextSchema = z.object({
  timestamp: z.number(),
  timezone: z.string().optional(),
  region: z.string().optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional(),
});

export const AuditClassificationSchema = z.object({
  sensitivity: z.string().optional(),
  retention: z.string().optional(),
  piiFields: z.array(z.string()).optional(),
  complianceFlags: z.array(z.string()).optional(),
});

export const AuditIntegritySchema = z.object({
  previousHash: z.string().optional(),
  currentHash: z.string(),
  signature: z.string().optional(),
  chainId: z.string().optional(),
});

export const AuditEventSchema = z.object({
  eventId: UUIDSchema,
  eventType: z.string(),
  category: z.string(),
  version: z.string().optional(),
  actor: AuditActorSchema,
  target: AuditTargetSchema,
  action: AuditActionSchema,
  context: AuditContextSchema,
  classification: AuditClassificationSchema.optional(),
  integrity: AuditIntegritySchema.optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type AuditIntegrity = z.infer<typeof AuditIntegritySchema>;

export const AuditQueryFiltersSchema = z.object({
  actorId: z.string().optional(),
  category: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  targetId: z.string().optional(),
  limit: z.number().min(1).max(500).optional(),
  cursor: z.string().optional(),
});

export type AuditQueryFilters = z.infer<typeof AuditQueryFiltersSchema>;
