import { Schema } from '@ocentra/schema-domain/effect';

export const VitestConfigFileSchema = Schema.String.pipe(
  Schema.filter((value) => value.endsWith('.config.ts') || 'Vitest config file must end with .config.ts'),
  Schema.brand('VitestConfigFile'),
);
export type VitestConfigFile = typeof VitestConfigFileSchema.Type;
export const decodeVitestConfigFile = Schema.decodeUnknownSync(VitestConfigFileSchema);

export const VitestConfigFile = {
  Unit: decodeVitestConfigFile('vitest.unit.config.ts'),
  Integration: decodeVitestConfigFile('vitest.integration.config.ts'),
  E2E: decodeVitestConfigFile('vitest.e2e.config.ts'),
  Websocket: decodeVitestConfigFile('vitest.websocket.config.ts'),
  Contract: decodeVitestConfigFile('vitest.contract.config.ts'),
  UnitThreads: decodeVitestConfigFile('vitest.unit-threads.config.ts'),
  IntegrationThreads: decodeVitestConfigFile('vitest.integration-threads.config.ts'),
  E2EThreads: decodeVitestConfigFile('vitest.e2e-threads.config.ts'),
} as const;

export type VitestConfigFileValue = (typeof VitestConfigFile)[keyof typeof VitestConfigFile];
