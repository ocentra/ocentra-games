import { Schema } from '@ocentra/schema-domain/effect';

export const StackTraceSchema = Schema.String.pipe(Schema.brand('StackTrace'));
export type StackTrace = typeof StackTraceSchema.Type;
export const decodeStackTrace = Schema.decodeUnknownSync(StackTraceSchema);

export function getStackTrace(): StackTrace {
  return decodeStackTrace(new Error().stack || '');
}
