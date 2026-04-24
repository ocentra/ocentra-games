#!/usr/bin/env node

/**
 * Development Server Manager with Port Management
 * 
 * Ensures clean start of Vite development server:
 * 1. Single instance enforcement via lock file
 * 2. Auto-kill stale processes on port 3000
 * 3. Smart port allocation (prefers 3000, falls back if needed)
 * 4. Starts Vite server on allocated port
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';
import process from 'process';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { ViteLogger, getStackTrace } from '../../vite/utils/viteLogger';

const VERBOSE_DEV_SCRIPT = process.env.VITE_VERBOSE_DEV_SCRIPT === 'true';
const log = ViteLogger.instance;
log.register('DevScript', import.meta.url);

const execAsync = promisify(exec);

// ============================================================================
// Types & Interfaces
// ============================================================================

interface PortOccupant {
  pid: number;
  name: string;
  isOurs: boolean;
}

interface LockData {
  timestamp: number;
  pid: number;
  port: number;
}

// ============================================================================
// Configuration
// ============================================================================

const PREFERRED_PORT = 3000;
const RANGE_START = 3000;
const RANGE_END = 3100;
const PROCESS_NAMES = ['node', 'vite']; // Process names we consider "ours"
const LOCK_FILE = path.join(process.cwd(), '.vite-dev.lock');
const REGISTRY_CACHE_FILE = path.join(process.cwd(), '.dev-registry-hash');
const SCAN_CACHE_FILE = path.join(process.cwd(), '.dev-scan-hash');
const REGISTRY_INPUT_DIRS = ['src', 'packages/asset-domain/src', 'packages/game-asset-domain/src'] as const;
const SCAN_INPUT_DIR = 'packages/asset-editor/Resources';
const DEV_SCRIPT_STARTED_AT = Date.now();
const VITE_OPTIMIZE_CACHE_DIR = path.join(process.cwd(), 'node_modules', '.vite');

function stageLog(message: string): void {
  console.log(`[dev:vite +${Date.now() - DEV_SCRIPT_STARTED_AT}ms] ${message}`);
}

function walkMtimes(dir: string, cwd: string): Array<{ p: string; m: number }> {
  const out: Array<{ p: string; m: number }> = [];
  const full = path.join(cwd, dir);
  if (!fs.existsSync(full)) return out;
  const scan = (d: string) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(d, e.name);
      const rel = path.relative(cwd, fullPath).replace(/\\/g, '/');
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '__tests__' && e.name !== 'dist') scan(fullPath);
      } else {
        try {
          const stat = fs.statSync(fullPath);
          out.push({ p: rel, m: stat.mtimeMs });
        } catch {
          /* skip */
        }
      }
    }
  };
  scan(full);
  return out;
}

function computeDirHash(dirs: string[]): string {
  const cwd = process.cwd();
  const h = createHash('sha256');
  for (const dir of dirs) {
    const entries = walkMtimes(dir, cwd);
    entries.sort((a, b) => a.p.localeCompare(b.p));
    for (const { p, m } of entries) {
      h.update(p);
      h.update(String(m));
    }
  }
  return h.digest('hex');
}

function isRegistryCacheValid(): boolean {
  if (!fs.existsSync(REGISTRY_CACHE_FILE)) return false;
  try {
    const stored = fs.readFileSync(REGISTRY_CACHE_FILE, 'utf-8').trim();
    return stored === computeDirHash([...REGISTRY_INPUT_DIRS]);
  } catch {
    return false;
  }
}

function writeRegistryCache(): void {
  try {
    fs.writeFileSync(REGISTRY_CACHE_FILE, computeDirHash([...REGISTRY_INPUT_DIRS]), 'utf-8');
  } catch {
    /* non-fatal */
  }
}

function isScanCacheValid(): boolean {
  if (!fs.existsSync(SCAN_CACHE_FILE)) return false;
  try {
    const stored = fs.readFileSync(SCAN_CACHE_FILE, 'utf-8').trim();
    return stored === computeDirHash([SCAN_INPUT_DIR]);
  } catch {
    return false;
  }
}

function writeScanCache(): void {
  try {
    fs.writeFileSync(SCAN_CACHE_FILE, computeDirHash([SCAN_INPUT_DIR]), 'utf-8');
  } catch {
    /* non-fatal */
  }
}

function clearViteOptimizeCache(): void {
  try {
    if (fs.existsSync(VITE_OPTIMIZE_CACHE_DIR)) {
      fs.rmSync(VITE_OPTIMIZE_CACHE_DIR, { recursive: true, force: true });
      console.log('🧹 Cleared Vite optimize cache');
    }
  } catch {
    /* non-fatal */
  }
}

// ============================================================================
// Port Management Functions
// ============================================================================

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
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

/**
 * Get ALL processes using a port (cross-platform)
 */
async function getPortOccupants(port: number): Promise<PortOccupant[]> {
  const occupants: PortOccupant[] = [];
  
  try {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          const pid = parseInt(match[1]);
          try {
            const { stdout: taskList } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
            const processName = taskList.split(',')[0].replace(/"/g, '').trim();
            
            // Check if process is ours (Vite or Node)
            const isOurs = PROCESS_NAMES.some(name => 
              processName.toLowerCase().includes(name.toLowerCase())
            );
            
            occupants.push({
              pid,
              name: processName,
              isOurs
            });
          } catch {
            // Process might have exited, skip it
          }
        }
      }
    } else {
      const { stdout } = await execAsync(`lsof -i :${port} -t`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      for (const pidStr of pids) {
        const pid = parseInt(pidStr);
        if (pid) {
          try {
            const { stdout: psOut } = await execAsync(`ps -p ${pid} -o comm=`);
            const processName = psOut.trim();
            
            const isOurs = PROCESS_NAMES.some(name => 
              processName.includes(name)
            );
            
            occupants.push({ pid, name: processName, isOurs });
          } catch {
            // Process might have exited, skip it
          }
        }
      }
    }
  } catch {
    // Port might not be in use
  }
  
  return occupants;
}

/**
 * Kill a process by PID
 */
async function killProcess(pid: number): Promise<boolean> {
  try {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      await execAsync(`kill -9 ${pid}`);
    }
    
    // Wait a bit for the port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch (err) {
    console.error(`Failed to kill process ${pid}:`, (err as Error).message);
    return false;
  }
}

/**
 * Check if process is alive
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for existing instance via lock file and kill if found
 */
async function checkSingleInstance(): Promise<void> {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lockData: LockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      const oldPid = lockData.pid;
      
      if (isProcessAlive(oldPid)) {
        console.log(`🔄 Found existing dev server instance (PID: ${oldPid}), killing it...`);
        
        const killed = await killProcess(oldPid);
        
        if (killed) {
          console.log('   ✅ Old instance killed successfully');
        } else {
          console.log('   ⚠️  Failed to kill old instance, continuing anyway...');
        }
      } else {
        console.log('⚠️  Stale lock file detected (process not running), removing...');
      }
      
      fs.unlinkSync(LOCK_FILE);
    } catch {
      console.log('⚠️  Invalid lock file, removing...');
      fs.unlinkSync(LOCK_FILE);
    }
  }
}

/**
 * Create lock file
 */
function createLockFile(port: number): void {
  const lockData: LockData = {
    timestamp: Date.now(),
    pid: process.pid,
    port
  };
  
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
  
  const cleanup = () => {
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {
      // Ignore
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

/**
 * Kill all processes using a port
 */
async function killAllPortOccupants(port: number): Promise<boolean> {
  const occupants = await getPortOccupants(port);
  const ourProcesses = occupants.filter(o => o.isOurs);
  
  if (ourProcesses.length === 0) {
    return false;
  }
  
  console.log(`   🔄 Killing ${ourProcesses.length} stale process(es) on port ${port}...`);
  
  for (const occupant of ourProcesses) {
    console.log(`      Killing: ${occupant.name} (PID: ${occupant.pid})`);
    await killProcess(occupant.pid);
  }
  
  return true;
}

/**
 * Ensure port is free by killing our processes and waiting
 */
async function ensurePortFree(port: number, maxRetries: number = 5): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Check if port is available
    if (await isPortAvailable(port)) {
      return true;
    }
    
    // Kill any of our processes using the port
    const killed = await killAllPortOccupants(port);
    
    if (killed) {
      // Wait longer for port to be released (increasing wait time)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    } else {
      // Port is used by something else, not ours
      return false;
    }
  }
  
  // After all retries, check one more time
  return await isPortAvailable(port);
}

/**
 * Find an available port, preferring 3000
 */
async function allocatePort(): Promise<number> {
  console.log(`\n🔍 Port Manager\n`);
  console.log('1️⃣  Checking for existing instance...');
  await checkSingleInstance();
  console.log('   ✅ No other instances detected\n');
  
  console.log('2️⃣  Allocating port...\n');
  console.log(`📍 Checking preferred port ${PREFERRED_PORT}...`);
  
  // Force cleanup of port before checking
  console.log(`🔧 Forcing port ${PREFERRED_PORT} cleanup...`);
  await killAllPortOccupants(PREFERRED_PORT);
  
  // Try to ensure port 3000 is free
  const port3000Free = await ensurePortFree(PREFERRED_PORT);
  
  if (port3000Free) {
    console.log(`   ✅ Port ${PREFERRED_PORT} available`);
    createLockFile(PREFERRED_PORT);
    process.env.VITE_PORT = PREFERRED_PORT.toString();
    process.env.PORT = PREFERRED_PORT.toString();
    return PREFERRED_PORT;
  }
  
  // Port 3000 is used by something else
  const occupants = await getPortOccupants(PREFERRED_PORT);
  if (occupants.length > 0) {
    const externalProcess = occupants.find(o => !o.isOurs);
    if (externalProcess) {
      console.log(`   ⚠️  Port ${PREFERRED_PORT} in use by external process: ${externalProcess.name} (PID: ${externalProcess.pid})`);
    }
  }
  
  console.log(`   🔍 Scanning for free port in range ${RANGE_START}-${RANGE_END}...`);
  
  for (let port = RANGE_START; port <= RANGE_END; port++) {
    if (port === PREFERRED_PORT) continue;
    
    if (await isPortAvailable(port)) {
      console.log(`   ✅ Found free port: ${port}`);
      createLockFile(port);
      process.env.VITE_PORT = port.toString();
      process.env.PORT = port.toString();
      return port;
    }
  }
  
  console.error(`\n❌ ERROR: No available ports in range ${RANGE_START}-${RANGE_END}`);
  console.error(`   All ports are busy! Please check your system and try again.\n`);
  process.exit(1);
}

// ============================================================================
// Vite Server Management
// ============================================================================

async function startViteServer(port: number) {
  console.log(`🔍 Ensuring port ${port} is truly free before starting Vite...`);
  
  // Kill any leftover processes one more time, in case OS spawned child processes
  await killAllPortOccupants(port);
  
  // Wait until the port is genuinely free (can bind)
  let ready = false;
  for (let i = 0; i < 15; i++) {
    if (await isPortAvailable(port)) {
      // Double-check by binding & closing a test server
      try {
        const s = net.createServer();
        await new Promise<void>((res, rej) => {
          s.once('error', rej);
          s.listen(port, '127.0.0.1', () => {
            s.close();
            res();
          });
        });
        ready = true;
        break;
      } catch {
        // Not free yet, continue waiting
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (!ready) {
    console.error(`❌ Port ${port} did not become free after waiting.`);
    process.exit(1);
  }
  
  console.log(`🚀 Starting Vite development server on port ${port}...\n`);
  
  const isWindows = process.platform === 'win32';
  
  // Set environment variables for Vite
  process.env.PORT = port.toString();
  process.env.VITE_PORT = port.toString();
  
  // Spawn Vite process with the allocated port and strict port mode
  const vite = spawn('vite', ['--port', port.toString(), '--strict-port'], { 
    stdio: 'inherit', 
    shell: isWindows,
    env: { ...process.env, PORT: port.toString(), VITE_PORT: port.toString() }
  });
  
  vite.on('error', (err) => {
    console.error('❌ Failed to start Vite:', err.message);
    process.exit(1);
  });
  
  let shuttingDown = false;
  
  const cleanup = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n👋 Stopping dev server...');
    vite.kill('SIGTERM');
    setTimeout(() => {
      try {
        vite.kill('SIGKILL');
      } catch {
        // Process already dead
      }
      process.exit(0);
    }, 2000);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  vite.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) {
      console.error(`❌ Vite exited with code ${code}`);
      process.exit(code);
    }
  });

  return new Promise<void>((resolve) => {
    vite.once('spawn', () => {
      console.log('   ✅ Vite process spawned\n');
    });
    vite.on('exit', () => {
      if (shuttingDown) {
        resolve();
      }
    });
  });
}

// ============================================================================
// Database Cleanup
// ============================================================================

function clearLogDatabase(): boolean {
  const dbPath = path.join(process.cwd(), 'database', 'Log.db');

  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const db = new Database(dbPath);

    try {
      const result = db.prepare('DELETE FROM logs').run();
      db.prepare('VACUUM').run();
      db.close();

      return result.changes > 0;
    } catch (error) {
      db.close();
      throw error;
    }
  } catch {
    return false;
  }
}

const APP_LOG_DB_DIR = path.join(process.cwd(), 'packages', 'logging-domain', 'db');

function clearAppLogStorage(): boolean {
  let wiped = false;
  for (const scope of ['main', 'vite']) {
    const dir = path.join(APP_LOG_DB_DIR, 'ndjson', scope);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((n) => n.endsWith('.ndjson'));
    for (const name of files) {
      fs.unlinkSync(path.join(dir, name));
      wiped = true;
    }
  }
  for (const name of ['main-log.duckdb', 'vite-log.duckdb']) {
    const dbPath = path.join(APP_LOG_DB_DIR, name);
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      wiped = true;
    }
  }
  return wiped;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  try {
    const { execSync } = await import('child_process');
    execSync('npx tsx scripts/generate-exports-flattened.ts', { stdio: 'pipe' });
  } catch {
    /* non-fatal - file may already exist */
  }
  stageLog('Starting main Vite bootstrap');
  try {
    clearViteOptimizeCache();

    if (clearLogDatabase()) {
      console.log('🧹 Cleared Log.db\n');
    }
    if (clearAppLogStorage()) {
      console.log('🧹 Cleared app logs (ndjson + DuckDB)\n');
    }

    if (VERBOSE_DEV_SCRIPT) {
      log.logInfo('Ensuring clean start of development environment', getStackTrace());
    }
    
    const skipRegistry = isRegistryCacheValid();
    if (skipRegistry) {
      stageLog('Registry generation skipped (cache hit)');
      console.log('📋 Registry maps unchanged (cache).');
    } else {
      const registryStartedAt = Date.now();
      if (VERBOSE_DEV_SCRIPT) {
        log.logInfo('Generating registry maps and populating database', getStackTrace());
      }
      try {
        const { execSync } = await import('child_process');
        execSync('tsx scripts/generate-registry-maps.ts', { stdio: 'inherit' });
        writeRegistryCache();
        stageLog(`Registry generation completed in ${Date.now() - registryStartedAt}ms`);
        if (VERBOSE_DEV_SCRIPT) {
          log.logInfo('Registry maps generated and database populated', getStackTrace());
        }
      } catch (error) {
        log.logError('Registry map generation failed', getStackTrace(), { error: error instanceof Error ? error.message : String(error) });
        process.exit(1);
      }
    }

    const skipAssetScan = process.env.VITE_SKIP_ASSET_SCAN === '1' || process.env.VITE_SKIP_ASSET_SCAN === 'true';
    const skipScanByCache = !skipAssetScan && isScanCacheValid();
    if (skipScanByCache) {
      stageLog('Asset scan skipped (cache hit)');
      console.log('📦 Asset scan unchanged (cache).');
    } else if (!skipAssetScan) {
      stageLog('Asset middleware scan bypassed by design');
      console.log('📦 Asset middleware scan removed (editor now Tauri/filesystem-first).');
      writeScanCache();
      console.log('   ✅ Continuing without Vite asset scan\n');
    } else {
      stageLog('Asset scan skipped by env override');
      console.log('📦 Skipping asset scan (VITE_SKIP_ASSET_SCAN=1)\n');
    }

    const validationStartedAt = Date.now();
    try {
      const { execSync } = await import('child_process');
      execSync('tsx scripts/validate-required-fields.ts', { stdio: 'inherit' });
      stageLog(`Required field validation completed in ${Date.now() - validationStartedAt}ms`);
    } catch (error) {
      log.logError('Asset validation failed', getStackTrace(), { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }

    process.env.VITE_SKIP_ASSET_VALIDATION = '1';

    console.log('🔌 Allocating port...');
    const allocateStartedAt = Date.now();
    const port = await allocatePort();
    stageLog(`Port allocation completed in ${Date.now() - allocateStartedAt}ms`);
    console.log(`   ✅ Port ${port} allocated\n`);
    
    if (VERBOSE_DEV_SCRIPT) {
      stageLog(`Port allocation completed in ${Date.now() - allocateStartedAt}ms`);
      log.logInfo('Port allocated successfully', getStackTrace(), { port });
      log.logInfo('Dev Server started', getStackTrace(), { url: `http://localhost:${port}` });
    }
    
    stageLog(`Handing off to Vite on port ${port}`);
    await startViteServer(port);
  } catch (error) {
    log.logError('Error in dev script', getStackTrace(), { error: (error as Error).message });
    process.exit(1);
  }
}

main();
