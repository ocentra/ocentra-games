import * as fs from 'fs';
import * as path from 'path';
import { RunType, LogRealm } from './types';
import {
  getDefaultNdjsonOutputDir,
  getSuiteTypeFromPath,
  getFileKeyFromSuitePath,
} from './ndjsonPaths';

export type WipeSuiteType = 'unit' | 'integration' | 'e2e' | 'contract' | 'all';

export type WipeScope = {
  runTypes: RunType[];
  suiteType: WipeSuiteType;
  testFile?: string;
};

export function wipeNdjsonScope(
  scope: WipeScope,
  outputDir?: string
): { wiped: string[] } {
  const base = path.join(outputDir ?? getDefaultNdjsonOutputDir(), LogRealm.Cloudflare);
  const wiped: string[] = [];

  if (scope.suiteType === 'all' && !scope.testFile) {
    if (fs.existsSync(base)) {
      fs.rmSync(base, { recursive: true, force: true });
      wiped.push(base);
    }
    fs.mkdirSync(base, { recursive: true });
    return { wiped };
  }

  const suiteTypes: string[] =
    scope.suiteType === 'all'
      ? ['unit', 'integration', 'e2e', 'websocket', 'contract']
      : [scope.suiteType];

  for (const runType of scope.runTypes) {
    const runTypeDir = path.join(base, runType);
    if (scope.testFile) {
      const st = getSuiteTypeFromPath(scope.testFile);
      const fileKey = getFileKeyFromSuitePath(scope.testFile);
      const dir = path.join(runTypeDir, st, fileKey);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        wiped.push(dir);
      }
      fs.mkdirSync(path.dirname(dir), { recursive: true });
    } else {
      for (const st of suiteTypes) {
        const dir = path.join(runTypeDir, st);
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          wiped.push(dir);
        }
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  return { wiped };
}
