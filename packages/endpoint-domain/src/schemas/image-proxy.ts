/**
 * Image proxy endpoint Zod schemas.
 */

import { z } from 'zod';

// ============================================================================
// Query Parameters
// ============================================================================

export const ImageProxyQuerySchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.enum(['webp', 'jpeg', 'png']).optional(),
});
