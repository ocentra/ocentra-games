#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { ensurePortFree, getPortOccupants, isProcessAlive, isPortAvailable } from './port-utils';

export type ViteManagerOptions = {
  preferredPort: number;
  rangeStart: number;
  rangeEnd: number;
  lockFile: string;
  cwd: string;
  spawnCommand: string;
  spawnArgs: string[];
  spawnEnv?: NodeJS.ProcessEnv;
  spawnShell?: boolean;
  logPrefix: string;
  verbose?: boolean;
  beforeAllocate?: () => Promise<void> | void;
  beforeStart?: () => Promise<void> | void;
  onAllocated?: (port: number) => void;
  shouldKillOccupant?: (occupant: { pid: number; name: string; commandLine: string }) => boolean;
};

function log(prefix: string, message: string): void {
  console.log(`[${prefix}] ${message}`);
}

function formatDurationMs(ms: number): string {
  if (ms >= 60_000) {
    return `${(ms / 60_000).toFixed(2)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

function createLockFile(lockFile: string, port: number): void {
  fs.writeFileSync(
    lockFile,
    JSON.stringify(
      {
        timestamp: Date.now(),
        pid: process.pid,
        port,
      },
      null,
      2
    )
  );

  const cleanup = () => {
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // ignore
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

async function checkSingleInstance(lockFile: string, port: number, shouldKill: NonNullable<ViteManagerOptions['shouldKillOccupant']>, prefix: string): Promise<void> {
  if (!fs.existsSync(lockFile)) {
    return;
  }

  try {
    const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8')) as { pid?: number };
    const oldPid = typeof lockData.pid === 'number' ? lockData.pid : null;
    if (oldPid && isProcessAlive(oldPid)) {
      log(prefix, `Found existing dev server instance (PID: ${oldPid}), reclaiming port ${port}...`);
      await ensurePortFree(
        port,
        (occupant) => occupant.pid === oldPid || shouldKill(occupant),
        (message) => log(prefix, message)
      );
    }
  } catch {
    // ignore invalid lock
  }

  try {
    fs.unlinkSync(lockFile);
  } catch {
    // ignore
  }
}

async function allocatePort(options: ViteManagerOptions): Promise<number> {
  const shouldKill = options.shouldKillOccupant ?? ((occupant) => {
    const lowerName = occupant.name.toLowerCase();
    return lowerName.includes('node') || lowerName.includes('vite');
  });

  log(options.logPrefix, `Checking for existing instance via ${options.lockFile}...`);
  await checkSingleInstance(options.lockFile, options.preferredPort, shouldKill, options.logPrefix);

  if (options.beforeAllocate) {
    await options.beforeAllocate();
  }

  log(options.logPrefix, `Checking preferred port ${options.preferredPort}...`);
  await ensurePortFree(options.preferredPort, shouldKill, (message) => log(options.logPrefix, message));

  if (await isPortAvailable(options.preferredPort)) {
    createLockFile(options.lockFile, options.preferredPort);
    process.env.PORT = String(options.preferredPort);
    process.env.VITE_PORT = String(options.preferredPort);
    options.onAllocated?.(options.preferredPort);
    return options.preferredPort;
  }

  const occupants = await getPortOccupants(options.preferredPort);
  const external = occupants.find((occupant) => !shouldKill(occupant));
  if (external) {
    log(
      options.logPrefix,
      `Preferred port ${options.preferredPort} is used by external process ${external.name || 'unknown'} (PID: ${external.pid}).`
    );
  }

  for (let port = options.rangeStart; port <= options.rangeEnd; port += 1) {
    if (port === options.preferredPort) {
      continue;
    }

    if (await isPortAvailable(port)) {
      createLockFile(options.lockFile, port);
      process.env.PORT = String(port);
      process.env.VITE_PORT = String(port);
      options.onAllocated?.(port);
      return port;
    }
  }

  throw new Error(`No available port in range ${options.rangeStart}-${options.rangeEnd}.`);
}

async function waitUntilBindable(port: number, prefix: string, shouldKill: NonNullable<ViteManagerOptions['shouldKillOccupant']>): Promise<void> {
  log(prefix, `Ensuring port ${port} is truly free before starting Vite...`);
  await ensurePortFree(port, shouldKill, (message) => log(prefix, message));

  let ready = false;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (await isPortAvailable(port)) {
      try {
        const server = net.createServer();
        await new Promise<void>((resolve, reject) => {
          server.once('error', reject);
          server.listen(port, '127.0.0.1', () => {
            server.close();
            resolve();
          });
        });
        ready = true;
        break;
      } catch {
        // keep waiting
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!ready) {
    throw new Error(`Port ${port} did not become free after waiting.`);
  }
}

export async function runManagedVite(options: ViteManagerOptions): Promise<void> {
  const shouldKill = options.shouldKillOccupant ?? ((occupant) => {
    const lowerName = occupant.name.toLowerCase();
    return lowerName.includes('node') || lowerName.includes('vite');
  });

  const startedAt = Date.now();
  const allocateStartedAt = Date.now();
  const port = await allocatePort(options);
  log(
    options.logPrefix,
    `Port ${port} allocated in ${formatDurationMs(Date.now() - allocateStartedAt)}.`
  );

  if (options.beforeStart) {
    const beforeStartAt = Date.now();
    await options.beforeStart();
    log(
      options.logPrefix,
      `Pre-start tasks completed in ${formatDurationMs(Date.now() - beforeStartAt)}.`
    );
  }

  const bindableStartedAt = Date.now();
  await waitUntilBindable(port, options.logPrefix, shouldKill);
  log(
    options.logPrefix,
    `Port ${port} confirmed bindable in ${formatDurationMs(Date.now() - bindableStartedAt)}.`
  );

  log(options.logPrefix, `Starting Vite dev server on port ${port}...`);

  process.env.PORT = String(port);
  process.env.VITE_PORT = String(port);

  const vite = spawn(options.spawnCommand, options.spawnArgs, {
    cwd: options.cwd,
    stdio: 'inherit',
    shell: options.spawnShell ?? process.platform === 'win32',
    env: {
      ...process.env,
      ...(options.spawnEnv ?? {}),
      PORT: String(port),
      VITE_PORT: String(port),
    },
  });

  vite.on('error', (error) => {
    console.error(`[${options.logPrefix}] Failed to start Vite: ${error.message}`);
    process.exit(1);
  });

  let shuttingDown = false;
  const cleanup = () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    log(options.logPrefix, 'Stopping dev server...');
    vite.kill('SIGTERM');
    setTimeout(() => {
      try {
        vite.kill('SIGKILL');
      } catch {
        // ignore
      }
      process.exit(0);
    }, 2000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await new Promise<void>((resolve, reject) => {
    vite.once('spawn', () => {
      log(
        options.logPrefix,
        `Vite process spawned after ${formatDurationMs(Date.now() - startedAt)}.`
      );
    });
    vite.once('exit', (code) => {
      if (!shuttingDown && code && code !== 0) {
        reject(new Error(`Vite exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

export function computeDirHash(dirs: readonly string[], cwd: string): string {
  const hash = createHash('sha256');

  const walk = (dir: string, out: Array<{ path: string; mtime: number }>): void => {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(cwd, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '__tests__' && entry.name !== 'dist') {
          walk(fullPath, out);
        }
        continue;
      }

      try {
        const stat = fs.statSync(fullPath);
        out.push({ path: relativePath, mtime: stat.mtimeMs });
      } catch {
        // ignore
      }
    }
  };

  for (const dir of dirs) {
    const entries: Array<{ path: string; mtime: number }> = [];
    walk(path.join(cwd, dir), entries);
    entries.sort((left, right) => left.path.localeCompare(right.path));
    for (const entry of entries) {
      hash.update(entry.path);
      hash.update(String(entry.mtime));
    }
  }

  return hash.digest('hex');
}

export function runCheckedCommand(command: string, cwd: string): void {
  execSync(command, { cwd, stdio: 'inherit' });
}
