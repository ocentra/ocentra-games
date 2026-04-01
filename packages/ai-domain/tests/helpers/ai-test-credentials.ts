export function getSubstituteDefaultApiKey(): string {
  const v = process.env.CF_TESTS_AI_SUBSTITUTE_DEFAULT_KEY;
  if (!v || v.trim() === '') {
    throw new Error('CF_TESTS_AI_SUBSTITUTE_DEFAULT_KEY must be set for substitute adapter tests (repo-root .env)');
  }
  return v;
}

export function getLeakageFakeKey(): string {
  const v = process.env.CF_TESTS_AI_LEAKAGE_FAKE_KEY;
  if (!v || v.trim() === '') {
    throw new Error('CF_TESTS_AI_LEAKAGE_FAKE_KEY must be set for key-leakage tests (repo-root .env)');
  }
  return v;
}
