import type { RunType } from '../test-log/types';

export const LogConsumer = {
  Cloudflare: 'cloudflare',
  Main: 'main',
  Solana: 'solana',
  AssetEditor: 'asset-editor',
} as const;

export type LogConsumer = (typeof LogConsumer)[keyof typeof LogConsumer];

export interface BridgeLogPayload {
  log_timestamp: number;
  level: string;
  consumer: LogConsumer;
  source: string | null;
  context: string | null;
  message: string;
  data: string | null;
  file: string | null;
  file_path: string | null;
  line: number | null;
  column: number | null;
  correlation_id: string | null;
  tags: string | null;
  stack: string | null;
  suite_path: string | null;
  suite_type: string | null;
  origin: string | null;
  environment: string | null;
}

export interface BridgeEntry {
  testName: string;
  runId: string;
  log: BridgeLogPayload;
  consumer?: LogConsumer;
  runType?: RunType;
}
