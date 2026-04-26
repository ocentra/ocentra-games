export function createDraftSessionId(scope: string): string {
  return `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
