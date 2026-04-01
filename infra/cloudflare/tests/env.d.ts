import 'vitest';

declare module 'vitest' {
  interface ProvidedContext {
    testRunId: string;
    testRunStartTime: string;
  }
}
