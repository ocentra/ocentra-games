import * as path from 'path';
import { fileURLToPath } from 'url';

const LOG_BRIDGE_OUTPUT_ENV = 'LOG_BRIDGE_OUTPUT';

export const NDJSON_SUMMARIES_DIR = 'summaries';

export function getDefaultNdjsonOutputDir(): string {
  const env = process.env[LOG_BRIDGE_OUTPUT_ENV];
  if (env && typeof env === 'string' && env.trim()) return path.resolve(env.trim());
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dir, '..', '..', 'logs');
}

export function getSuiteTypeFromPath(testFilePath: string): string {
  const lower = testFilePath.toLowerCase();
  if (lower.includes('integration')) return 'integration';
  if (lower.includes('e2e')) return 'e2e';
  if (lower.includes('websocket')) return 'websocket';
  if (lower.includes('contract')) return 'contract';
  return 'unit';
}

export function sanitizeTestNameForNdjson(testName: string): string {
  const sanitized = testName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
  return sanitized || 'unnamed-test';
}

export function extractSuiteFileName(suitePath: string): string {
  const fileName = suitePath.split(/[/\\]/).pop() || 'unknown';
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getFileKeyFromSuitePath(suitePath: string): string {
  const normalized = suitePath.replace(/\\/g, '/');
  const match = normalized.match(/\/(unit|integration|e2e|websocket|contract)\/(.*)$/i);
  if (match) return match[2].replace(/\//g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
  return extractSuiteFileName(suitePath);
}
