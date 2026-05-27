#!/usr/bin/env node

import {
  createManagedProcessRegistry,
  ensureLocalCloudflareWorker,
  killManagedProcesses,
} from './cloudflare-dev-bootstrap';

const registry = createManagedProcessRegistry();

function log(message: string): void {
  console.log(`[dev:worker] ${message}`);
}

function shutdown(): void {
  log('Shutting down...');
  killManagedProcesses(registry);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main(): Promise<void> {
  const { workerBase } = await ensureLocalCloudflareWorker(registry, log);
  log(`Worker is available at ${workerBase}`);
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error(`[dev:worker] Fatal: ${error instanceof Error ? error.message : String(error)}`);
  killManagedProcesses(registry);
  process.exit(1);
});
