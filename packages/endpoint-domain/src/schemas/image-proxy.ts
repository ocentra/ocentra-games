/**
 * Image proxy endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';

// ============================================================================
// Query Parameters
// ============================================================================

export const ImageProxyQuerySchema = schema.object({
  url: schema.string().url(),
  width: schema.number().int().positive().optional(),
  height: schema.number().int().positive().optional(),
  format: schema.enum(['webp', 'jpeg', 'png']).optional(),
});
