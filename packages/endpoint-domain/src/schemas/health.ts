/**
 * Health endpoint Zod schemas.
 */

import { z } from 'zod';
import { TimestampSchema } from './common';

/**
 * Health response schema.
 */
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: TimestampSchema.optional(),
  version: z.string().optional(),
});
