import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig, type UserConfig, type PluginOption } from 'vitest/config';

type WorkerConfigFactory = (context: { inject: (key: string) => string }) => Record<string, unknown>;

type LegacyWorkerPoolOptions = {
  workers?: WorkerConfigFactory;
} & Record<string, unknown>;

type LegacyTestConfig = NonNullable<UserConfig['test']> & {
  poolOptions?: LegacyWorkerPoolOptions;
};

type LegacyWorkersConfig = UserConfig & {
  test?: LegacyTestConfig;
};

function normalizePlugins(plugins: UserConfig['plugins']): PluginOption[] {
  if (!plugins) return [];
  return Array.isArray(plugins) ? plugins : [plugins];
}

export function defineWorkersConfig(config: LegacyWorkersConfig): ReturnType<typeof defineConfig> {
  const testConfig: LegacyTestConfig = { ...(config.test ?? {}) };
  const workerFactory = testConfig.poolOptions?.workers;

  if (testConfig.poolOptions) {
    const poolOptions = { ...testConfig.poolOptions };
    delete poolOptions.workers;
    if (Object.keys(poolOptions).length > 0) {
      testConfig.poolOptions = poolOptions;
    } else {
      delete testConfig.poolOptions;
    }
  }

  return defineConfig({
    ...config,
    plugins: workerFactory
      ? [
        cloudflareTest(({ inject }) => workerFactory({ inject })),
        ...normalizePlugins(config.plugins),
      ]
      : normalizePlugins(config.plugins),
    test: testConfig,
  });
}
