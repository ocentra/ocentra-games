/**
 * Health endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { TimestampSchema } from './common';

/**
 * Health response schema.
 */
export const HealthResponseSchema = schema.object({
  status: schema.literal('ok'),
  timestamp: TimestampSchema.optional(),
  version: schema.string().optional(),
});
