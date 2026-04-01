import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteType } from '@ocentra/logging-domain/test-log/types';
import { StorageType } from '../../../src/constants/storage-type.js';
import { normalizeToRepoRelative } from './path-utils.js';

const SUITE_TYPE_MAP_RELATIVE = 'test-runner/suite-type-map.json';

export interface SuiteTypeEntry {
  type: TestSuiteType;
  storage: StorageType;
  runIn?: 'pool' | 'unstable' | null;
  poolSequential?: boolean;
}

export interface SuiteTypeMapData {
  generatedAt: string;
  map: Record<string, SuiteTypeEntry>;
}

const PATH_SEGMENT_UNIT = 'unit';
const PATH_SEGMENT_INTEGRATION = 'integration';
const PATH_SEGMENT_E2E = 'e2e';
const PATH_SEGMENT_CONTRACTS = 'contracts';
const PATH_SEGMENT_WEBSOCKET_ISOLATED = 'websocket-isolated-storage';
const PATH_SEGMENT_WEBSOCKET_SECURITY = 'websocket-security';
const PREFIX_TESTS_UNIT = 'tests/unit/';
const PREFIX_TESTS_INTEGRATION = 'tests/integration/';
const PREFIX_TESTS_E2E = 'tests/e2e/';
const PREFIX_TESTS_CONTRACTS = 'tests/contracts/';

export const SUITE_TYPE_TO_DIR: Record<string, string> = {
  [TestSuiteType.Unit]: 'unit',
  [TestSuiteType.Integration]: 'integration',
  [TestSuiteType.E2E]: 'e2e',
  [TestSuiteType.Contract]: 'contracts',
  [TestSuiteType.Websocket]: 'integration',
};

export function deriveSuiteType(suitePath: string): TestSuiteType {
  const normalized = suitePath.replace(/\\/g, '/');
  if (
    normalized.includes(PATH_SEGMENT_WEBSOCKET_ISOLATED) ||
    normalized.includes(PATH_SEGMENT_WEBSOCKET_SECURITY)
  ) {
    return TestSuiteType.Websocket;
  }
  if (
    normalized.includes(`/${PATH_SEGMENT_CONTRACTS}/`) ||
    normalized.includes('\\' + PATH_SEGMENT_CONTRACTS + '\\') ||
    normalized.startsWith(PREFIX_TESTS_CONTRACTS)
  ) {
    return TestSuiteType.Contract;
  }
  if (
    normalized.includes(`/${PATH_SEGMENT_UNIT}/`) ||
    normalized.includes('\\' + PATH_SEGMENT_UNIT + '\\')
  )
    return TestSuiteType.Unit;
  if (
    normalized.includes(`/${PATH_SEGMENT_INTEGRATION}/`) ||
    normalized.includes('\\' + PATH_SEGMENT_INTEGRATION + '\\')
  )
    return TestSuiteType.Integration;
  if (
    normalized.includes(`/${PATH_SEGMENT_E2E}/`) ||
    normalized.includes('\\' + PATH_SEGMENT_E2E + '\\')
  )
    return TestSuiteType.E2E;
  if (normalized.startsWith(PREFIX_TESTS_UNIT)) return TestSuiteType.Unit;
  if (normalized.startsWith(PREFIX_TESTS_INTEGRATION)) return TestSuiteType.Integration;
  if (normalized.startsWith(PREFIX_TESTS_E2E)) return TestSuiteType.E2E;
  return TestSuiteType.Unit;
}

let cachedMap: Map<string, SuiteTypeEntry> | null = null;

export function clearSuiteTypeMapCache(): void {
  cachedMap = null;
}

export function loadSuiteTypeMap(cwd: string): Map<string, SuiteTypeEntry> {
  if (cachedMap) return cachedMap;
  const mapPath = path.join(cwd, SUITE_TYPE_MAP_RELATIVE);
  if (fs.existsSync(mapPath)) {
    try {
      const raw = fs.readFileSync(mapPath, 'utf-8');
      const data = JSON.parse(raw) as SuiteTypeMapData;
      cachedMap = new Map(Object.entries(data.map ?? {}));
      return cachedMap;
    } catch {
      cachedMap = new Map();
      return cachedMap;
    }
  }
  cachedMap = new Map();
  return cachedMap;
}

export function getSuiteType(
  filePath: string,
  cwd: string = process.cwd()
): SuiteTypeEntry | null {
  const map = loadSuiteTypeMap(cwd);
  const key = normalizeToRepoRelative(filePath, cwd);
  const entry = map.get(key);
  if (entry) return entry;
  const derivedType = deriveSuiteType(key);
  return { type: derivedType, storage: StorageType.Ephemeral, runIn: null, poolSequential: false };
}

export function getSuiteTypeWithFallback(
  filePath: string,
  cwd: string = process.cwd()
): SuiteTypeEntry {
  const result = getSuiteType(filePath, cwd);
  if (result) return result;
  const key = normalizeToRepoRelative(filePath, cwd);
  return {
    type: deriveSuiteType(key),
    storage: StorageType.Ephemeral,
    runIn: null,
    poolSequential: false,
  };
}

export function getIntegrationPhaseFiles(cwd: string): {
  parallelPool: string[];
  sequentialPool: string[];
  unstable: string[];
} {
  const map = loadSuiteTypeMap(cwd);
  const parallelPool: string[] = [];
  const sequentialPool: string[] = [];
  const unstable: string[] = [];
  for (const [key, entry] of map) {
    if (entry.type !== TestSuiteType.Integration && entry.type !== TestSuiteType.Websocket) continue;
    if (entry.type === TestSuiteType.Websocket) continue;
    const runIn = entry.runIn ?? 'pool';
    if (runIn === 'unstable') {
      unstable.push(key);
    } else {
      if (entry.poolSequential) sequentialPool.push(key);
      else parallelPool.push(key);
    }
  }
  parallelPool.sort();
  sequentialPool.sort();
  unstable.sort();
  return { parallelPool, sequentialPool, unstable };
}

export function getE2EPhaseFiles(cwd: string): { pool: string[]; unstable: string[] } {
  const map = loadSuiteTypeMap(cwd);
  const pool: string[] = [];
  const unstable: string[] = [];
  for (const [key, entry] of map) {
    if (entry.type !== TestSuiteType.E2E) continue;
    const runIn = entry.runIn ?? 'pool';
    if (runIn === 'unstable') unstable.push(key);
    else pool.push(key);
  }
  pool.sort();
  unstable.sort();
  return { pool, unstable };
}

export function getUnitPhaseFiles(cwd: string): {
  parallelPool: string[];
  sequentialPool: string[];
  unstable: string[];
} {
  const map = loadSuiteTypeMap(cwd);
  const parallelPool: string[] = [];
  const sequentialPool: string[] = [];
  const unstable: string[] = [];
  for (const [key, entry] of map) {
    if (entry.type !== TestSuiteType.Unit) continue;
    const runIn = entry.runIn ?? 'pool';
    if (runIn === 'unstable') {
      unstable.push(key);
    } else {
      if (entry.poolSequential) sequentialPool.push(key);
      else parallelPool.push(key);
    }
  }
  parallelPool.sort();
  sequentialPool.sort();
  unstable.sort();
  return { parallelPool, sequentialPool, unstable };
}

export function getUnstableIncludeFiles(cwd: string): string[] {
  const { unstable } = getIntegrationPhaseFiles(cwd);
  const { unstable: e2eUnstable } = getE2EPhaseFiles(cwd);
  const combined = [...unstable, ...e2eUnstable];
  combined.sort();
  return combined;
}

export function getWebsocketIncludeFiles(cwd: string): string[] {
  const map = loadSuiteTypeMap(cwd);
  const files: string[] = [];
  for (const [key, entry] of map) {
    if (entry.type === TestSuiteType.Websocket) files.push(key);
  }
  files.sort();
  if (files.length > 0) return files;
  const fallback = [
    `${PREFIX_TESTS_INTEGRATION}websocket-isolated-storage.test.ts`,
    `${PREFIX_TESTS_INTEGRATION}websocket-security.test.ts`,
  ];
  return fallback;
}

export function getContractPhaseFiles(cwd: string): { pool: string[] } {
  const map = loadSuiteTypeMap(cwd);
  const pool: string[] = [];
  for (const [key, entry] of map) {
    if (entry.type === TestSuiteType.Contract) pool.push(key);
  }
  pool.sort();
  return { pool };
}
