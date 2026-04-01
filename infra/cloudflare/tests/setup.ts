import { webcrypto } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

if (!('crypto' in globalThis)) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true
  });
}

function parseEnvLineValue(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
    value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return value;
}

function loadEnvFile(envPath: string): void {
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;

      const key = trimmed.substring(0, equalIndex).trim();
      const value = parseEnvLineValue(trimmed.substring(equalIndex + 1));

      if (key && value !== '' && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDir = __dirname;
const parentDir = join(testDir, '..');
const repoRootDir = join(testDir, '..', '..', '..');

loadEnvFile(join(repoRootDir, '.env'));

const localEnvFile = join(parentDir, '.env');
const localDevVarsFile = join(parentDir, '.dev.vars');

loadEnvFile(localEnvFile);
loadEnvFile(localDevVarsFile);

if (process.env.CI === 'true' || process.env.CI === '1') {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}


