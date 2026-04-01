#!/usr/bin/env node

import ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

export interface MutationTarget {
  file: string;
  symbolName: string;
  kind: 'function' | 'method' | 'class';
  reason: string;
  invariants: readonly string[];
  notes?: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface MutationPlan {
  generatedAt: string;
  targets: MutationTarget[];
}

function fail(message: string): never {
  console.error(`❌ Mutation Collector Error: ${message}`);
  process.exit(1);
}

function getJSDocCommentText(sourceFile: ts.SourceFile, node: ts.Node): string | null {
  const commentRanges = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
  if (!commentRanges || commentRanges.length === 0) {
    return null;
  }
  
  for (const range of commentRanges) {
    if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
      const commentText = sourceFile.text.substring(range.pos, range.end);
      if (commentText.includes('@mutation')) {
        return commentText;
      }
    }
  }
  return null;
}

function parseJSDocComment(commentText: string): { reason?: string; invariants: string[]; notes?: string } | null {
  if (!commentText.includes('@mutation')) {
    return null;
  }
  
  const reasonMatch = commentText.match(/@mutation-reason\s+(.+?)(?:\n|\*\/|$)/s);
  const reason = reasonMatch?.[1]?.trim().replace(/\*\s*/g, '').trim();
  
  const invariantMatches = Array.from(commentText.matchAll(/@mutation-invariant\s+(.+?)(?:\n|\*\/|$)/gs));
  const invariants = invariantMatches.map(m => m[1]?.trim().replace(/\*\s*/g, '').trim()).filter(Boolean);
  
  const notesMatch = commentText.match(/@mutation-notes\s+(.+?)(?:\n|\*\/|$)/s);
  const notes = notesMatch?.[1]?.trim().replace(/\*\s*/g, '').trim();
  
  if (!reason || invariants.length === 0) {
    return null;
  }
  
  return { reason, invariants, notes };
}

function getMutationJSDocTag(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  const commentText = getJSDocCommentText(sourceFile, node);
  if (!commentText) return false;
  return commentText.includes('@mutation');
}

function processSourceFile(
  sourceFile: ts.SourceFile,
  normalizedSourceRoot: string,
  tsconfigDirNormalized: string
): MutationTarget[] {
  const targets: MutationTarget[] = [];
  const fileName = sourceFile.fileName;

  if (sourceFile.isDeclarationFile) return targets;
  if (fileName.includes('node_modules')) return targets;
  if (fileName.includes('dist')) return targets;
  if (fileName.includes('.test.') || fileName.includes('.spec.')) return targets;
  if (fileName.includes('/tests/') || fileName.includes('\\tests\\')) return targets;
  
  const absoluteFileName = path.isAbsolute(fileName) 
    ? fileName 
    : path.resolve(tsconfigDirNormalized, fileName);
  const normalizedFileName = path.normalize(absoluteFileName).toLowerCase();
  
  const sourceRootCheck = normalizedFileName.startsWith(normalizedSourceRoot);
  const inSourceDir = normalizedFileName.includes('src') && !normalizedFileName.includes('node_modules');
  
  if (!sourceRootCheck && !inSourceDir) {
    return targets;
  }

  const visit = (node: ts.Node) => {
    let targetNode: ts.Node | null = null;
    let symbolName: string | null = null;
    let kind: MutationTarget['kind'] | null = null;

    if (ts.isFunctionDeclaration(node) && node.name) {
      targetNode = node;
      symbolName = node.name.text;
      kind = 'function';
    } else if (ts.isClassDeclaration(node) && node.name) {
      targetNode = node;
      symbolName = node.name.text;
      kind = 'class';
    } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      targetNode = node;
      symbolName = node.name.text;
      kind = 'method';
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
            targetNode = node;
            symbolName = decl.name.text;
            kind = 'function';
            break;
          }
        }
      }
    }

    if (targetNode && symbolName && kind) {
      if (getMutationJSDocTag(targetNode, sourceFile)) {
        const parsed = parseJSDocComment(getJSDocCommentText(sourceFile, targetNode)!);
        
        if (parsed) {
          const relativePath = path.relative(process.cwd(), sourceFile.fileName);
          const startPos = sourceFile.getLineAndCharacterOfPosition(targetNode.getStart(sourceFile));
          const endPos = sourceFile.getLineAndCharacterOfPosition(targetNode.getEnd());

          targets.push({
            file: relativePath,
            symbolName,
            kind,
            reason: parsed.reason!,
            invariants: parsed.invariants,
            notes: parsed.notes,
            startLine: startPos.line + 1,
            startColumn: startPos.character + 1,
            endLine: endPos.line + 1,
            endColumn: endPos.character + 1,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);

  return targets;
}

export function collectMutations(
  tsconfigPath: string,
  sourceRoot: string = '.'
): MutationPlan {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    fail(`Failed to read tsconfig: ${configFile.error.messageText}`);
  }

  const tsconfigDir = path.dirname(path.resolve(tsconfigPath));
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    tsconfigDir
  );

  if (parsed.errors.length > 0) {
    const errors = parsed.errors.map(e => e.messageText).join(', ');
    fail(`Failed to parse tsconfig: ${errors}`);
  }

  const program = ts.createProgram(parsed.fileNames, parsed.options);

  const sourceRootAbs = path.resolve(tsconfigDir, sourceRoot);
  const normalizedSourceRoot = path.normalize(sourceRootAbs).toLowerCase();
  const tsconfigDirNormalized = path.normalize(tsconfigDir).toLowerCase();

  const sourceFiles = program.getSourceFiles();
  const targetsMap = new Map<string, MutationTarget>();

  for (const sourceFile of sourceFiles) {
    const fileTargets = processSourceFile(
      sourceFile,
      normalizedSourceRoot,
      tsconfigDirNormalized
    );

    for (const target of fileTargets) {
      const key = `${target.file}:${target.symbolName}`;
      if (!targetsMap.has(key)) {
        targetsMap.set(key, target);
      }
    }
  }

  const targets = Array.from(targetsMap.values());

  return {
    generatedAt: new Date().toISOString(),
    targets,
  };
}

const isMainModule = import.meta.url === `file://${path.resolve(process.argv[1] || '').replace(/\\/g, '/')}` || 
                     (process.argv[1] && import.meta.url.replace(/\\/g, '/').endsWith(path.basename(process.argv[1])));

if (isMainModule) {
  const tsconfig = process.argv[2] || 'tsconfig.json';
  const outputPath = process.argv[3] || 'mutation-plan.json';
  const sourceRoot = process.argv[4] || 'src';

  if (!fs.existsSync(tsconfig)) {
    fail(`tsconfig.json not found: ${tsconfig}`);
  }

  const plan = collectMutations(tsconfig, sourceRoot);

  if (plan.targets.length === 0) {
    console.log('[mutation] No @mutation JSDoc tags found in src/. Skipping Stryker.');
    process.exit(0);
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(plan, null, 2),
    'utf-8'
  );

  console.log(`✅ Collected ${plan.targets.length} mutation target(s):`);
  for (const target of plan.targets) {
    console.log(`   - ${target.file}:${target.symbolName} (${target.kind})`);
  }
  console.log(`📋 Mutation plan written to: ${outputPath}`);
}
