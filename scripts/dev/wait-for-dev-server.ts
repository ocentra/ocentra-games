#!/usr/bin/env node

function getArg(name: string, fallback: string): string {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match?.split('=').slice(1).join('=') || fallback;
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      await response.text().catch(() => undefined);
      if (response.ok) {
        return;
      }
    } catch {
      void 0;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`);
}

async function main(): Promise<void> {
  const url = getArg('--url', 'http://localhost:3000');
  const timeoutMs = parseInt(getArg('--timeout', '180000'), 10);

  console.log(`[wait-for-dev-server] Waiting for ${url}...`);
  await waitForUrl(url, timeoutMs);
  console.log(`[wait-for-dev-server] ${url} is ready.`);
}

main().catch((error) => {
  console.error('[wait-for-dev-server] Fatal:', error);
  process.exit(1);
});
