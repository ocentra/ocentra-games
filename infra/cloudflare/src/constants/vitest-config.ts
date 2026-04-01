export type VitestConfigFile = string & { readonly __brand: 'VitestConfigFile' };

export const VitestConfigFile = {
  Unit: 'vitest.unit.config.ts' as VitestConfigFile,
  Integration: 'vitest.integration.config.ts' as VitestConfigFile,
  E2E: 'vitest.e2e.config.ts' as VitestConfigFile,
  Websocket: 'vitest.websocket.config.ts' as VitestConfigFile,
  Contract: 'vitest.contract.config.ts' as VitestConfigFile,
  UnitThreads: 'vitest.unit-threads.config.ts' as VitestConfigFile,
  IntegrationThreads: 'vitest.integration-threads.config.ts' as VitestConfigFile,
  E2EThreads: 'vitest.e2e-threads.config.ts' as VitestConfigFile,
} as const;

export type VitestConfigFileValue = (typeof VitestConfigFile)[keyof typeof VitestConfigFile];
