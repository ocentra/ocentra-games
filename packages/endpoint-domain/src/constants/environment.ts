export const Environment = {
  Production: 'production',
  Development: 'development',
  Staging: 'staging',
  Dev: 'dev',
  CI: 'ci',
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

export function detectEnvironment(
  env: { ENVIRONMENT?: string },
  processEnv?: { CI?: string }
): Environment {
  if (processEnv?.CI === 'true' || processEnv?.CI === '1') {
    return Environment.CI;
  }
  const e = env.ENVIRONMENT;
  if (e === Environment.Production) return Environment.Production;
  if (e === Environment.Staging) return Environment.Staging;
  if (e === Environment.Development || e === Environment.Dev) return Environment.Development;
  return Environment.Development;
}
