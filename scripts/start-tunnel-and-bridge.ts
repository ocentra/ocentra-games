/**
 * Start Tunnel + Bridge (single entry point)
 *
 * Run this once. It kills any previous instance of this script and anything on the bridge port,
 * then starts one bridge (localhost:8765) and optionally the cloudflared tunnel.
 *
 * 1. Kill other instances of this script and process on port 8765
 * 2. Start bridge, poll until ready
 * 3. If cloudflared present: start tunnel; bridge shuts down when tunnel exits
 *
 * Usage:
 *   CLI: npm run tunnel:bridge  (or npx tsx scripts/start-tunnel-and-bridge.ts)
 *   Programmatic: import { ensureBridgeRunning, waitForBridge } from './start-tunnel-and-bridge'
 */

import { spawn, spawnSync, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const isWin = os.platform() === 'win32';

function hasCloudflared(): boolean {
  const cmd = isWin ? 'where' : 'which';
  const result = spawnSync(cmd, ['cloudflared'], { shell: isWin, stdio: 'pipe' });
  return result.status === 0;
}

const BRIDGE_DIR = path.join(ROOT, 'packages', 'logging-domain');
const BRIDGE_PORT = 8765;
const HEALTH_URL = `http://127.0.0.1:${BRIDGE_PORT}/__health__`;
const HEALTH_TIMEOUT_MS = 30000;
const HEALTH_POLL_INTERVAL_MS = 500;
const WAIT_NOT_RUNNING_MS = 5000;
const WAIT_NOT_RUNNING_POLL_MS = 200;
const TUNNEL_NAME = process.env.TUNNEL_NAME || 'ocentra-log-bridge';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const SELF_PATTERN = 'start-tunnel-and-bridge';

let bridgeProcess: ChildProcess | null = null;

function getPidsOfSelf(): number[] {
  const pids: number[] = [];
  try {
    if (isWin) {
      const out = spawnSync('wmic', [
        'process',
        'where',
        `commandline like '%${SELF_PATTERN}%'`,
        'get',
        'processid',
      ], { encoding: 'utf8', shell: true, windowsHide: true });
      const lines = (out.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const pid = parseInt(lines[i], 10);
        if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) pids.push(pid);
      }
    } else {
      const out = spawnSync('pgrep', ['-f', SELF_PATTERN], { encoding: 'utf8' });
      const s = (out.stdout || '').trim();
      if (s) {
        for (const id of s.split(/\s+/)) {
          const pid = parseInt(id, 10);
          if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) pids.push(pid);
        }
      }
    }
  } catch {
    // ignore
  }
  return pids;
}

function killPids(pids: number[]): void {
  for (const pid of pids) {
    try {
      if (isWin) {
        spawnSync('taskkill', ['/PID', String(pid), '/F', '/T'], { shell: true, stdio: 'pipe' });
      } else {
        spawnSync('kill', ['-9', String(pid)], { stdio: 'pipe' });
      }
      log(`Killed previous instance (PID ${pid})`);
    } catch {
      // ignore
    }
  }
}

function killProcessOnPort(port: number): boolean {
  try {
    if (isWin) {
      const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true });
      const lines = (netstat.stdout || '').split('\n');
      const pids = new Set<number>();
      for (const line of lines) {
        if (!line.includes(`:${port}`)) continue;
        const parts = line.trim().split(/\s+/);
        const pidStr = parts[parts.length - 1];
        const pid = parseInt(pidStr, 10);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
      for (const pid of pids) {
        spawnSync('taskkill', ['/PID', String(pid), '/F', '/T'], { shell: true, stdio: 'pipe' });
        log(`Killed process on port ${port} (PID ${pid})`);
      }
      return pids.size > 0;
    }
    const lsof = spawnSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8' });
    const out = (lsof.stdout || '').trim();
    if (!out) return false;
    const pids = out.split(/\s+/).filter(Boolean).map((s) => parseInt(s, 10)).filter((n) => n > 0);
    for (const pid of pids) {
      spawnSync('kill', ['-9', String(pid)], { stdio: 'pipe' });
      log(`Killed process on port ${port} (PID ${pid})`);
    }
    return pids.length > 0;
  } catch {
    return false;
  }
}

function log(msg: string, silent = false): void {
  if (silent) return;
  const ts = new Date().toISOString().slice(11, 19);
  process.stdout.write(`[${ts}] ${msg}\n`);
}

async function waitUntilNotRunning(silent = false): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < WAIT_NOT_RUNNING_MS) {
    const result = await healthCheck();
    if (!result.ok) {
      log(`Port ${BRIDGE_PORT} confirmed free`, silent);
      return true;
    }
    log(`Port ${BRIDGE_PORT} still in use, waiting...`, silent);
    await new Promise((r) => setTimeout(r, WAIT_NOT_RUNNING_POLL_MS));
  }
  log(`Port ${BRIDGE_PORT} still in use after ${WAIT_NOT_RUNNING_MS}ms`, silent);
  return false;
}

function healthCheck(): Promise<{ ok: boolean; stored?: number }> {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 2000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ ok: data.ok === true, stored: data.stored });
        } catch {
          resolve({ ok: false });
        }
      });
    });
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false });
    });
  });
}

export async function waitForBridge(silent = false): Promise<boolean> {
  const start = Date.now();
  log(`Waiting for bridge at ${HEALTH_URL}...`, silent);

  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    const result = await healthCheck();
    if (result.ok) {
      log(`Bridge is ready (stored: ${result.stored ?? 0})`, silent);
      return true;
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
  }

  log(`ERROR: Bridge health check timed out after ${HEALTH_TIMEOUT_MS}ms`, silent);
  return false;
}

function startBridge(silent = false, detached = false): ChildProcess {
  log(`Starting bridge: npm run bridge (port ${BRIDGE_PORT})`, silent);

  const proc = spawn(npmCmd, ['run', 'bridge'], {
    cwd: BRIDGE_DIR,
    env: { ...process.env },
    stdio: detached ? 'ignore' : ['ignore', 'pipe', 'pipe'],
    shell: isWin,
    windowsHide: true,
    detached,
  });

  if (detached) {
    proc.unref();
  }

  if (!detached) {
    proc.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        log(`[bridge] ${line}`, silent);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        log(`[bridge:err] ${line}`, silent);
      }
    });

    proc.on('error', (err) => {
      log(`ERROR: Bridge spawn failed: ${err.message}`, silent);
    });

    proc.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        log(`Bridge exited with code ${code}`, silent);
      } else if (signal) {
        log(`Bridge killed by signal ${signal}`, silent);
      }
    });
  }

  return proc;
}

/**
 * Ensure bridge is running. Call from global-setup or anywhere.
 * Always: kill any process on bridge port, then start bridge (detached), wait for health.
 * Returns true if bridge is ready, false if timed out.
 */
export async function ensureBridgeRunning(options?: { silent?: boolean }): Promise<boolean> {
  const silent = options?.silent ?? false;

  killProcessOnPort(BRIDGE_PORT);
  await new Promise((r) => setTimeout(r, 800));

  const portFree = await waitUntilNotRunning(silent);
  if (!portFree) {
    return false;
  }

  log('Starting bridge...', silent);
  startBridge(silent, true);
  return waitForBridge(silent);
}

export interface RunStartedPayload {
  runType?: string;
  testFiles?: string[];
  suiteType?: string;
  wipeAll?: boolean;
}

/**
 * Signal run started to bridge: wipes .bridge-received-temp.ndjson and optionally ND output dirs.
 * Call at start of each test run (e.g. from global-setup). Returns true if bridge accepted.
 * If payload.wipeAll, bridge wipes all of logs/cloudflare. Else if payload.runType, bridge wipes by runType + suiteType or testFiles.
 */
export async function signalRunStarted(runId?: string, payload?: RunStartedPayload): Promise<boolean> {
  const check = await healthCheck();
  if (!check.ok) return false;

  const startedAt = new Date().toISOString();
  const body: { runId?: string; startedAt: string; runType?: string; testFiles?: string[]; suiteType?: string; wipeAll?: boolean } = { startedAt };
  if (runId != null) body.runId = runId;
  if (payload?.runType != null) body.runType = payload.runType;
  if (payload?.testFiles != null) body.testFiles = payload.testFiles;
  if (payload?.suiteType != null) body.suiteType = payload.suiteType;
  if (payload?.wipeAll === true) body.wipeAll = true;
  try {
    const res = await fetch(`${HEALTH_URL.replace('/__health__', '/__run_started__')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Wipe all ND output under logs/cloudflare. Call before a full-helper run (e.g. test:helper type=all).
 */
export async function wipeAllNdjson(): Promise<boolean> {
  return signalRunStarted(undefined, { wipeAll: true });
}

/**
 * Flush logs to bridge for a given runId.
 * Returns true if successful, false if bridge not running or flush failed.
 */
export async function flushBridge(runId: string): Promise<boolean> {
  const check = await healthCheck();
  if (!check.ok) return false;

  try {
    const res = await fetch(`${HEALTH_URL.replace('/__health__', '/__flush__')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function startTunnel(): ChildProcess {
  log(`Starting tunnel: cloudflared tunnel run ${TUNNEL_NAME}`);

  const proc = spawn('cloudflared', ['tunnel', 'run', TUNNEL_NAME], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin,
    windowsHide: true,
  });

  proc.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      log(`[tunnel] ${line}`);
    }
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      // cloudflared logs to stderr by default
      log(`[tunnel] ${line}`);
    }
  });

  proc.on('error', (err) => {
    log(`ERROR: Tunnel spawn failed: ${err.message}`);
    cleanup(1);
  });

  return proc;
}

function cleanup(exitCode: number): void {
  if (bridgeProcess && !bridgeProcess.killed) {
    log('Shutting down bridge...');
    if (isWin) {
      spawn('taskkill', ['/pid', String(bridgeProcess.pid), '/f', '/t'], { shell: true });
    } else {
      bridgeProcess.kill('SIGTERM');
    }
  }
  process.exit(exitCode);
}

async function main(): Promise<void> {
  const hasTunnel = hasCloudflared();

  log('='.repeat(50));
  log(hasTunnel ? 'Tunnel + Bridge' : 'Bridge Only (cloudflared not found)');
  log('='.repeat(50));

  const otherPids = getPidsOfSelf();
  if (otherPids.length > 0) {
    killPids(otherPids);
    await new Promise((r) => setTimeout(r, 1500));
  }
  killProcessOnPort(BRIDGE_PORT);
  await new Promise((r) => setTimeout(r, 800));

  const portFree = await waitUntilNotRunning();
  if (!portFree) {
    log('Aborting: port still in use');
    cleanup(1);
    return;
  }

  bridgeProcess = startBridge();
  const bridgeReady = await waitForBridge();
  if (!bridgeReady) {
    log('Aborting: bridge failed to start');
    cleanup(1);
    return;
  }

  // Handle process signals
  process.on('SIGINT', () => {
    log('Received SIGINT');
    cleanup(0);
  });

  process.on('SIGTERM', () => {
    log('Received SIGTERM');
    cleanup(0);
  });

  if (!hasTunnel) {
    log(`Bridge running at http://127.0.0.1:${BRIDGE_PORT} (local only)`);
    log('Install cloudflared for tunnel support: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
    bridgeProcess.on('exit', (code) => {
      log(`Bridge exited with code ${code ?? 0}`);
      process.exit(code ?? 0);
    });
    return;
  }

  // Start tunnel
  const tunnelProcess = startTunnel();

  // When tunnel exits, cleanup
  tunnelProcess.on('exit', (code) => {
    log(`Tunnel exited with code ${code ?? 0}`);
    cleanup(code ?? 0);
  });
}

// Only run main() when executed directly (not imported)
const isMain = process.argv[1]?.replace(/\\/g, '/').includes('start-tunnel-and-bridge');
if (isMain) {
  main().catch((err) => {
    log(`Fatal error: ${err.message}`);
    cleanup(1);
  });
}
