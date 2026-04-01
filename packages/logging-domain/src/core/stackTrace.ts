export type StackTrace = string & { readonly __brand: 'StackTrace' };

export function getStackTrace(): StackTrace {
  return (new Error().stack || '') as StackTrace;
}
