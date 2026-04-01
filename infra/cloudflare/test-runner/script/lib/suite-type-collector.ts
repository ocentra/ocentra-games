#!/usr/bin/env node

import ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteType, asTestSuiteTypeOrNull } from '@ocentra/logging-domain/test-log/types';
import type { SuiteTypeMapData } from './suite-type-map.js';
import { StorageType } from '../../../src/constants/storage-type.js';
import { normalizeToRepoRelative } from './path-utils.js';

const SUITE_TYPE_MAP_RELATIVE = 'test-runner/suite-type-map.json';
const TEST_SUITE_TYPE_IDENTIFIER = 'TestSuiteType';
const STORAGE_PROPERTY = 'storage';
const STORAGE_PERSISTENT = 'Persistent';
const RUN_IN_PROPERTY = 'runIn';
const RUN_IN_UNSTABLE = 'Unstable';
const RUN_IN_POOL = 'Pool';
const POOL_SEQUENTIAL_PROPERTY = 'poolSequential';

function isTopLevelDescribe(
  node: ts.Node,
  sourceFile: ts.SourceFile
): boolean {
  let current: ts.Node | undefined = node;
  while (current && current !== sourceFile) {
    if (current.parent && ts.isSourceFile(current.parent)) {
      const stmt = current;
      if (ts.isExpressionStatement(stmt) && stmt.expression === node) {
        return true;
      }
      return false;
    }
    current = current.parent;
  }
  return false;
}

function getDescribeCall(
  node: ts.Node
): { name: ts.Node; typeArg: ts.Node; fn: ts.Node; options?: ts.Node } | null {
  if (!ts.isCallExpression(node)) return null;
  const callee = node.expression;
  const DESCRIBE_NAME = 'describe';
  const ONLY_NAME = 'only';
  const SKIP_NAME = 'skip';
  const isDescribe =
    (ts.isIdentifier(callee) && callee.text === DESCRIBE_NAME) ||
    (ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === DESCRIBE_NAME &&
      ts.isIdentifier(callee.name) &&
      (callee.name.text === ONLY_NAME || callee.name.text === SKIP_NAME));
  if (!isDescribe) return null;
  const args = node.arguments;
  if (args.length < 3) return null;
  const first = args[0];
  const second = args[1];
  const third = args[2];
  if (!first || !second || !third) return null;
  const fourth = args[3];
  const hasOptions = args.length >= 4 && third && ts.isObjectLiteralExpression(third);
  return {
    name: first,
    typeArg: second,
    fn: hasOptions ? fourth! : third,
    options: hasOptions ? third : undefined,
  };
}

function getTestSuiteTypeLiteral(typeArg: ts.Node): TestSuiteType | null {
  if (ts.isPropertyAccessExpression(typeArg)) {
    const expr = typeArg.expression;
    const name = typeArg.name;
    if (ts.isIdentifier(expr) && ts.isIdentifier(name)) {
      if (expr.text === TEST_SUITE_TYPE_IDENTIFIER) {
        return asTestSuiteTypeOrNull(name.text) ?? null;
      }
    }
  }
  return null;
}

function getStorageFromOptions(optionsArg: ts.Node | undefined): StorageType {
  if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) return StorageType.Ephemeral;
  for (const prop of optionsArg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = prop.name;
    const key = ts.isIdentifier(name) ? name.text : (ts.isStringLiteral(name) ? name.text : null);
    if (key === STORAGE_PROPERTY && prop.initializer) {
      if (ts.isPropertyAccessExpression(prop.initializer)) {
        const p = prop.initializer.name;
        if (ts.isIdentifier(p) && p.text === STORAGE_PERSISTENT) return StorageType.Persistent;
      }
    }
  }
  return StorageType.Ephemeral;
}

function getRunInFromOptions(optionsArg: ts.Node | undefined): 'pool' | 'unstable' | null {
  if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) return null;
  for (const prop of optionsArg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = prop.name;
    const key = ts.isIdentifier(name) ? name.text : (ts.isStringLiteral(name) ? name.text : null);
    if (key === RUN_IN_PROPERTY && prop.initializer) {
      if (ts.isPropertyAccessExpression(prop.initializer)) {
        const p = prop.initializer.name;
        if (ts.isIdentifier(p) && p.text === RUN_IN_UNSTABLE) return 'unstable';
        if (ts.isIdentifier(p) && p.text === RUN_IN_POOL) return 'pool';
      }
      if (ts.isStringLiteral(prop.initializer)) {
        const v = prop.initializer.text;
        if (v === 'unstable') return 'unstable';
        if (v === 'pool') return 'pool';
      }
    }
  }
  return null;
}

function getPoolSequentialFromOptions(optionsArg: ts.Node | undefined): boolean {
  if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) return false;
  for (const prop of optionsArg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = prop.name;
    const key = ts.isIdentifier(name) ? name.text : (ts.isStringLiteral(name) ? name.text : null);
    if (key === POOL_SEQUENTIAL_PROPERTY && prop.initializer) {
      if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
    }
  }
  return false;
}

type CollectEntry = {
  type: TestSuiteType;
  storage: StorageType;
  runIn: 'pool' | 'unstable' | null;
  poolSequential: boolean;
};

function collectFile(filePath: string, content: string): CollectEntry | null {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  const entries: CollectEntry[] = [];

  const visit = (node: ts.Node) => {
    const desc = getDescribeCall(node);
    if (desc) {
      const isTop = isTopLevelDescribe(node, sourceFile);
      if (isTop) {
        const typeVal = getTestSuiteTypeLiteral(desc.typeArg);
        if (typeVal) {
          const storage = getStorageFromOptions(desc.options);
          const runIn = getRunInFromOptions(desc.options);
          const poolSequential = getPoolSequentialFromOptions(desc.options);
          entries.push({ type: typeVal, storage, runIn, poolSequential });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (entries.length === 0) return null;
  const type = entries[0].type;
  const storage = entries.some((e) => e.storage === StorageType.Persistent)
    ? StorageType.Persistent
    : StorageType.Ephemeral;
  const runIn = entries.find((e) => e.runIn !== null)?.runIn ?? null;
  const poolSequential = entries.some((e) => e.poolSequential);
  return { type, storage, runIn, poolSequential };
}

function findTestFiles(dir: string, cwd: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...findTestFiles(full, cwd));
    } else if (/\.(test|spec)\.ts$/i.test(e.name)) {
      out.push(path.resolve(cwd, full));
    }
  }
  return out;
}

export function runSuiteTypeCollector(cwd: string): SuiteTypeMapData {
  const testsDir = path.join(cwd, 'tests');
  const files = findTestFiles(testsDir, cwd);
  const map: SuiteTypeMapData['map'] = {};

  for (const absPath of files) {
    const content = fs.readFileSync(absPath, 'utf-8');
    const entry = collectFile(absPath, content);
    if (entry) {
      const key = normalizeToRepoRelative(absPath, cwd);
      const existing = map[key];
      const storage =
        existing?.storage === StorageType.Persistent ||
        entry.storage === StorageType.Persistent
          ? StorageType.Persistent
          : StorageType.Ephemeral;
      const runIn = entry.runIn ?? existing?.runIn ?? null;
      const poolSequential =
        entry.poolSequential ||
        (existing as { poolSequential?: boolean } | undefined)?.poolSequential ||
        false;
      map[key] = { type: entry.type, storage, runIn, poolSequential };
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    map,
  };
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (import.meta.url === `file://${path.resolve(process.argv[1]).replace(/\\/g, '/')}` ||
   import.meta.url.endsWith(path.basename(process.argv[1])));

if (isMain) {
  const cwd = process.cwd();
  const data = runSuiteTypeCollector(cwd);
  const outPath = path.join(cwd, SUITE_TYPE_MAP_RELATIVE);
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Suite type map written to ${outPath} (${Object.keys(data.map).length} entries)`);
}
