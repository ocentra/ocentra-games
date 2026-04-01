#!/usr/bin/env node

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import net from 'node:net';
import process from 'node:process';

const execAsync = promisify(exec);
const isWindows = process.platform === 'win32';

export type PortOccupant = {
  pid: number;
  name: string;
  commandLine: string;
};

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '127.0.0.1');
  });
}

export async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Port ${port} not open after ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 500);
        }
      });
    };
    attempt();
  });
}

async function getWindowsProcessName(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
    return stdout.split(',')[0]?.replace(/"/g, '').trim() || '';
  } catch {
    return '';
  }
}

async function getWindowsCommandLine(pid: number): Promise<string> {
  const command = [
    'powershell',
    '-NoProfile',
    '-Command',
    `"$p = Get-CimInstance Win32_Process -Filter \\"ProcessId = ${pid}\\"; if ($p) { $p.CommandLine }"`,
  ].join(' ');

  try {
    const { stdout } = await execAsync(command, { windowsHide: true });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function getUnixProcessName(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o comm=`);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function getUnixCommandLine(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o command=`);
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function getPortOccupants(port: number): Promise<PortOccupant[]> {
  const occupants: PortOccupant[] = [];

  try {
    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (!match) {
          continue;
        }

        const pid = parseInt(match[1], 10);
        if (!Number.isFinite(pid)) {
          continue;
        }

        const [name, commandLine] = await Promise.all([getWindowsProcessName(pid), getWindowsCommandLine(pid)]);
        occupants.push({ pid, name, commandLine });
      }
      return occupants;
    }

    const { stdout } = await execAsync(`lsof -i :${port} -t`);
    const pids = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((pid) => parseInt(pid, 10))
      .filter((pid) => Number.isFinite(pid));

    for (const pid of pids) {
      const [name, commandLine] = await Promise.all([getUnixProcessName(pid), getUnixCommandLine(pid)]);
      occupants.push({ pid, name, commandLine });
    }
  } catch {
    return occupants;
  }

  return occupants;
}

export async function killProcess(pid: number): Promise<boolean> {
  try {
    if (isWindows) {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      await execAsync(`kill -9 ${pid}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  } catch {
    return false;
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function killMatchingPortOccupants(
  port: number,
  shouldKill: (occupant: PortOccupant) => boolean,
  log: (message: string) => void
): Promise<boolean> {
  const occupants = await getPortOccupants(port);
  const matching = occupants.filter(shouldKill);

  if (matching.length === 0) {
    return false;
  }

  log(`Killing ${matching.length} stale process(es) on port ${port}...`);
  for (const occupant of matching) {
    log(`Killing ${occupant.name || 'unknown'} (PID: ${occupant.pid})`);
    await killProcess(occupant.pid);
  }

  return true;
}

export async function ensurePortFree(
  port: number,
  shouldKill: (occupant: PortOccupant) => boolean,
  log: (message: string) => void,
  maxRetries: number = 5
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    if (await isPortAvailable(port)) {
      return true;
    }

    const killed = await killMatchingPortOccupants(port, shouldKill, log);
    if (!killed) {
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }

  return await isPortAvailable(port);
}
