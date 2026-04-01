import { writeFileSync, existsSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import JSON5 from 'json5';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptDir = __dirname;
const repoRoot = join(scriptDir, '../../../../..');

const reportPath = join(scriptDir, 'meta-system-tdd-report.html');

const MANIFEST_GUID = 'ae9defb2-5527-4aaf-95f2-fc02ef6b3413';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TestResult {
  name: string;
  description: string;
  success: boolean;
  error?: string;
  data?: unknown;
  duration?: number;
  suite?: string;
}

interface VitestResult {
  numPassedTests: number;
  numFailedTests: number;
  numTotalTests: number;
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    assertionResults?: Array<{
      fullName: string;
      title: string;
      status: 'passed' | 'failed' | 'skipped';
      duration?: number;
      failureMessages?: string[];
    }>;
  }>;
}

function isValidUUID(guid: string): boolean {
  return UUID_REGEX.test(guid);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scanDirectory(dir: string, relativePath: string = ''): Promise<{
  assets: string[];
  metaFiles: string[];
  folders: string[];
}> {
  const assets: string[] = [];
  const metaFiles: string[] = [];
  const folders: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        folders.push(relPath);
        const subResult = await scanDirectory(fullPath, relPath);
        assets.push(...subResult.assets);
        metaFiles.push(...subResult.metaFiles);
        folders.push(...subResult.folders);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.meta')) {
          metaFiles.push(relPath);
        } else if (entry.name.endsWith('.asset')) {
          assets.push(relPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error);
  }

  return { assets, metaFiles, folders };
}

async function readMetaFile(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const meta = JSON5.parse(content);
    return meta as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

async function executeTest(test: { name: string; description: string; testFunction: () => Promise<{ success: boolean; error?: string; data?: unknown }> }): Promise<TestResult> {
  console.log(`\n[TEST ${test.name}] ${test.description}`);
  
  const startTime = Date.now();
  try {
    const result = await test.testFunction();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`  [✓ PASS] Duration: ${duration}ms`);
      if (result.data) {
        const dataStr = JSON.stringify(result.data, null, 2).substring(0, 400);
        console.log(`  [DATA] ${dataStr}`);
      }
      return {
        name: test.name,
        description: test.description,
        success: true,
        data: result.data,
        duration,
      };
    } else {
      console.log(`  [✗ FAIL] ${result.error || 'Unknown error'}`);
      return {
        name: test.name,
        description: test.description,
        success: false,
        error: result.error || 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`  [✗ FAIL] Exception: ${error instanceof Error ? error.message : String(error)}`);
    return {
      name: test.name,
      description: test.description,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

async function runValidationScript(): Promise<TestResult> {
  console.log('\n[VALIDATION] Running quick validation script...');
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync('npm run validate:meta-system', { cwd: repoRoot });
    const duration = Date.now() - startTime;
    const output = stdout + stderr;
    const passed = output.includes('✅ All validations passed') || (!output.includes('❌ Validation failed'));
    
    return {
      name: 'VALIDATION',
      description: 'Quick validation script - checks .meta files, GUIDs, duplicates, etc.',
      success: passed,
      duration,
      suite: 'Validation',
      data: { output: output.substring(0, 500) },
      error: passed ? undefined : 'Validation script reported errors or warnings',
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name: 'VALIDATION',
      description: 'Quick validation script - checks .meta files, GUIDs, duplicates, etc.',
      success: false,
      duration,
      suite: 'Validation',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runVitestTests(testFile: string, suiteName: string): Promise<TestResult[]> {
  console.log(`\n[VITEST] Running ${suiteName}...`);
  const startTime = Date.now();
  const results: TestResult[] = [];
  
  try {
    const { stdout, stderr } = await execAsync(
      `npx vitest run ${testFile} --reporter=json`,
      { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 }
    );
    
    const output = stdout + stderr;
    
    const lines = output.split('\n');
    let jsonLine = '';
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('{') && trimmed.includes('numTotalTests')) {
        jsonLine = trimmed;
        break;
      }
    }
    
    if (!jsonLine) {
      const jsonStart = output.lastIndexOf('{');
      const jsonEnd = output.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonLine = output.substring(jsonStart, jsonEnd + 1);
      }
    }
    
    if (jsonLine) {
      try {
        const vitestResult: VitestResult = JSON.parse(jsonLine);
        
        if (vitestResult.testResults && vitestResult.testResults.length > 0) {
          for (const testFile of vitestResult.testResults) {
            if (testFile.assertionResults && testFile.assertionResults.length > 0) {
              for (const test of testFile.assertionResults) {
                results.push({
                  name: test.title,
                  description: `${suiteName} - ${test.fullName}`,
                  success: test.status === 'passed',
                  duration: test.duration,
                  suite: suiteName,
                  error: test.status === 'failed' && test.failureMessages?.[0] ? test.failureMessages[0] : undefined,
                });
              }
            } else if (testFile.name) {
              results.push({
                name: testFile.name.split('/').pop() || suiteName,
                description: `${suiteName} - ${testFile.name}`,
                success: testFile.status === 'passed',
                duration: Date.now() - startTime,
                suite: suiteName,
              });
            }
          }
        } else {
          const passed = vitestResult.numFailedTests === 0;
          results.push({
            name: suiteName,
            description: `${suiteName} - ${passed ? 'All tests passed' : 'Some tests failed'}`,
            success: passed,
            duration: Date.now() - startTime,
            suite: suiteName,
            data: {
              passed: vitestResult.numPassedTests,
              failed: vitestResult.numFailedTests,
              total: vitestResult.numTotalTests,
            },
          });
        }
        
        console.log(`  [${suiteName}] Passed: ${vitestResult.numPassedTests}, Failed: ${vitestResult.numFailedTests}, Total: ${vitestResult.numTotalTests}`);
      } catch (parseError) {
        const passed = output.includes('Test Files') && output.includes('passed') && !output.includes('failed');
        const testCountMatch = output.match(/(\d+)\s+passed(?:.*?(\d+)\s+failed)?/);
        const parsedPassed = testCountMatch ? parseInt(testCountMatch[1], 10) : 0;
        const parsedFailed = testCountMatch && testCountMatch[2] ? parseInt(testCountMatch[2], 10) : 0;
        
        if (parsedPassed > 0) {
          for (let i = 0; i < parsedPassed; i++) {
            results.push({
              name: `${suiteName} Test ${i + 1}`,
              description: `${suiteName} - Test ${i + 1}`,
              success: true,
              duration: Math.floor((Date.now() - startTime) / parsedPassed),
              suite: suiteName,
            });
          }
          for (let i = 0; i < parsedFailed; i++) {
            results.push({
              name: `${suiteName} Test ${parsedPassed + i + 1}`,
              description: `${suiteName} - Test ${parsedPassed + i + 1}`,
              success: false,
              duration: Math.floor((Date.now() - startTime) / (parsedPassed + parsedFailed)),
              suite: suiteName,
              error: 'Test failed (details in console output)',
            });
          }
          console.log(`  [${suiteName}] Passed: ${parsedPassed}, Failed: ${parsedFailed}, Total: ${parsedPassed + parsedFailed}`);
        } else {
          results.push({
            name: suiteName,
            description: `${suiteName} - ${passed ? 'All tests passed (parsed from output)' : 'Failed to parse JSON, checking output'}`,
            success: passed,
            duration: Date.now() - startTime,
            suite: suiteName,
            error: passed ? undefined : (parseError instanceof Error ? parseError.message : String(parseError)),
          });
        }
      }
    } else {
      const duration = Date.now() - startTime;
      const passed = output.includes('Test Files') && output.includes('passed') && !output.includes('failed');
      const testCountMatch = output.match(/(\d+)\s+passed/);
      results.push({
        name: suiteName,
        description: `${suiteName} - ${passed ? 'All tests passed' : 'Some tests failed'}`,
        success: passed,
        duration,
        suite: suiteName,
        error: passed ? undefined : 'Failed to parse test results from output',
        data: testCountMatch ? { passed: parseInt(testCountMatch[1], 10) } : undefined,
      });
    }
  } catch (error) {
    results.push({
      name: suiteName,
      description: `${suiteName} - Execution error`,
      success: false,
      suite: suiteName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  return results;
}

async function runComprehensiveTests(): Promise<{ results: TestResult[]; passed: number; failed: number }> {
  console.log('[TDD] Meta System Complete Test Suite\n');
  console.log('This will run all validation and test suites\n');
  
  const allResults: TestResult[] = [];
  
  const validationResult = await runValidationScript();
  allResults.push(validationResult);
  
  const unitTestResults = await runVitestTests(
    'src/services/assets/__tests__/MetaFileService.test.ts',
    'Unit Tests (MetaFileService)'
  );
  allResults.push(...unitTestResults);
  
  const integrationTestResults = await runVitestTests(
    'src/services/assets/__tests__/integration/meta-system-integration.test.ts',
    'Integration Tests (EventBus)'
  );
  allResults.push(...integrationTestResults);
  
  console.log('\n[TDD] Meta System Comprehensive Validation Tests\n');
  console.log('This will validate the entire .meta file system architecture\n');

  const resourcesDir = join(repoRoot, 'packages', 'asset-editor', 'Resources');
  
  if (!existsSync(resourcesDir)) {
    console.error('[ERROR] Resources directory not found:', resourcesDir);
    return { results: [], passed: 0, failed: 0 };
  }

  console.log('[SETUP] Scanning Resources directory...');
  const { assets, metaFiles, folders } = await scanDirectory(resourcesDir);
  console.log(`[OK] Found ${assets.length} assets, ${metaFiles.length} .meta files, ${folders.length} folders\n`);

  const tests: Array<{ name: string; description: string; testFunction: () => Promise<{ success: boolean; error?: string; data?: unknown }> }> = [
    {
      name: 'META-1',
      description: 'All .asset files have corresponding .meta files',
      testFunction: async () => {
        const missing: string[] = [];
        for (const asset of assets) {
          const assetPath = join(resourcesDir, asset);
          const metaPath = `${assetPath}.meta`;
          if (!existsSync(metaPath)) {
            missing.push(asset);
          }
        }
        if (missing.length > 0) {
          return { success: false, error: `Missing .meta for ${missing.length} assets: ${missing.slice(0, 5).join(', ')}` };
        }
        return { success: true, data: { totalAssets: assets.length, allHaveMeta: true } };
      },
    },
    {
      name: 'META-2',
      description: 'All .meta files have valid GUID format',
      testFunction: async () => {
        const invalid: string[] = [];
        for (const metaFile of metaFiles) {
          const metaPath = join(resourcesDir, metaFile);
          const meta = await readMetaFile(metaPath);
          const guid = meta?.guid;
          if (meta && guid && typeof guid === 'string' && !isValidUUID(guid)) {
            invalid.push(metaFile);
          }
        }
        if (invalid.length > 0) {
          return { success: false, error: `Invalid GUID format in ${invalid.length} .meta files: ${invalid.slice(0, 5).join(', ')}` };
        }
        return { success: true, data: { totalMetaFiles: metaFiles.length, allValid: true } };
      },
    },
    {
      name: 'META-3',
      description: 'No duplicate GUIDs across all .meta files',
      testFunction: async () => {
        const guidMap = new Map<string, string[]>();
        for (const metaFile of metaFiles) {
          const metaPath = join(resourcesDir, metaFile);
          const meta = await readMetaFile(metaPath);
          const guid = meta?.guid;
          if (meta && guid && typeof guid === 'string') {
            if (!guidMap.has(guid)) {
              guidMap.set(guid, []);
            }
            guidMap.get(guid)!.push(metaFile);
          }
        }
        const duplicates: string[] = [];
        for (const [guid, files] of guidMap.entries()) {
          if (files.length > 1) {
            duplicates.push(guid);
          }
        }
        if (duplicates.length > 0) {
          return { success: false, error: `Found ${duplicates.length} duplicate GUIDs: ${duplicates.slice(0, 3).join(', ')}` };
        }
        return { success: true, data: { totalGuids: guidMap.size, noDuplicates: true } };
      },
    },
    {
      name: 'META-4',
      description: 'All .meta files have required fields (guid, type)',
      testFunction: async () => {
        const invalid: string[] = [];
        for (const metaFile of metaFiles) {
          const metaPath = join(resourcesDir, metaFile);
          const meta = await readMetaFile(metaPath);
          const guid = meta?.guid;
          const type = meta?.type;
          if (!meta || !guid || typeof guid !== 'string' || !type || typeof type !== 'string') {
            invalid.push(metaFile);
          }
        }
        if (invalid.length > 0) {
          return { success: false, error: `Missing required fields in ${invalid.length} .meta files: ${invalid.slice(0, 5).join(', ')}` };
        }
        return { success: true, data: { totalMetaFiles: metaFiles.length, allValid: true } };
      },
    },
    {
      name: 'META-5',
      description: 'No orphaned .meta files (meta without corresponding asset)',
      testFunction: async () => {
        const orphans: string[] = [];
        for (const metaFile of metaFiles) {
          if (metaFile.endsWith('folder.meta')) continue;
          const assetPath = join(resourcesDir, metaFile.replace(/\.meta$/, ''));
          if (!existsSync(assetPath)) {
            orphans.push(metaFile);
          }
        }
        if (orphans.length > 0) {
          return { success: false, error: `Found ${orphans.length} orphaned .meta files: ${orphans.slice(0, 5).join(', ')}` };
        }
        return { success: true, data: { totalMetaFiles: metaFiles.length, noOrphans: true } };
      },
    },
    {
      name: 'META-6',
      description: 'AssetRegistry.asset.meta exists with correct GUID',
      testFunction: async () => {
        const manifestPath = join(resourcesDir, 'AssetRegistry.asset');
        const manifestMetaPath = join(resourcesDir, 'AssetRegistry.asset.meta');
        
        if (!existsSync(manifestPath)) {
          return { success: false, error: 'AssetRegistry.asset not found (may be auto-created on startup)' };
        }
        
        if (!existsSync(manifestMetaPath)) {
          return { success: false, error: 'AssetRegistry.asset.meta not found' };
        }
        
        const meta = await readMetaFile(manifestMetaPath);
        const guid = meta?.guid;
        if (meta && guid && typeof guid === 'string' && guid === MANIFEST_GUID) {
          return { success: true, data: { guid, matches: true } };
        } else if (meta && guid && typeof guid === 'string') {
          return { success: false, error: `AssetRegistry GUID mismatch: expected ${MANIFEST_GUID}, got ${guid}` };
        } else {
        return { success: false, error: 'AssetRegistry.asset.meta missing guid field' };
        }
      },
    },
    {
      name: 'META-7',
      description: 'No __guid fields in .asset files (removed in Phase 3)',
      testFunction: async () => {
        const withGuid: string[] = [];
        for (const asset of assets) {
          const assetPath = join(resourcesDir, asset);
          const content = await readFile(assetPath, 'utf-8');
          if (content.includes('__guid:')) {
            withGuid.push(asset);
          }
        }
        if (withGuid.length > 0) {
          return { success: false, error: `Found __guid in ${withGuid.length} assets: ${withGuid.slice(0, 5).join(', ')}` };
        }
        return { success: true, data: { totalAssets: assets.length, noEmbeddedGuid: true } };
      },
    },
    {
      name: 'META-8',
      description: 'All .meta files have valid timestamps (createdAt, modifiedAt)',
      testFunction: async () => {
        const invalid: string[] = [];
        for (const metaFile of metaFiles) {
          const metaPath = join(resourcesDir, metaFile);
          const meta = await readMetaFile(metaPath);
          if (meta) {
            const createdAt = meta.createdAt;
            const modifiedAt = meta.modifiedAt;
            if (createdAt && (typeof createdAt === 'string' || typeof createdAt === 'number') && isNaN(new Date(createdAt).getTime())) {
              invalid.push(metaFile);
            }
            if (modifiedAt && (typeof modifiedAt === 'string' || typeof modifiedAt === 'number') && isNaN(new Date(modifiedAt).getTime())) {
              invalid.push(metaFile);
            }
          }
        }
        if (invalid.length > 0) {
          return { success: false, error: `Invalid timestamps in ${invalid.length} .meta files: ${invalid.slice(0, 5).join(', ')}` };
        }
        return { success: true, data: { totalMetaFiles: metaFiles.length, allValidTimestamps: true } };
      },
    },
  ];

  const comprehensiveResults: TestResult[] = [];
  for (const test of tests) {
    const result = await executeTest(test);
    comprehensiveResults.push(result);
    await sleep(100);
  }

  allResults.push(...comprehensiveResults);

  const passed = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;

  console.log(`\n[SUMMARY] Passed: ${passed}, Failed: ${failed}, Total: ${allResults.length}`);

  return { results: allResults, passed, failed };
}

function generateHTMLReport(results: TestResult[], passed: number, failed: number, totalDuration: number): string {
  const timestamp = new Date().toISOString();
  const passRate = results.length > 0 ? ((passed / results.length) * 100).toFixed(1) : '0';
  
  const resultsBySuite = new Map<string, TestResult[]>();
  for (const result of results) {
    const suite = result.suite || 'Comprehensive Tests';
    if (!resultsBySuite.has(suite)) {
      resultsBySuite.set(suite, []);
    }
    resultsBySuite.get(suite)!.push(result);
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meta System TDD Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      line-height: 1.6;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      color: #4CAF50;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .subtitle {
      color: #888;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #4CAF50;
    }
    .stat-card.failed { border-left-color: #f44336; }
    .stat-card h3 {
      color: #888;
      font-size: 0.9em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .stat-card .value {
      font-size: 2em;
      font-weight: bold;
      color: #e0e0e0;
    }
    .test-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .test-item {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #4CAF50;
    }
    .test-item.failed { border-left-color: #f44336; }
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .test-name {
      font-weight: bold;
      font-size: 1.1em;
      color: #e0e0e0;
    }
    .test-status {
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
    }
    .test-status.pass {
      background: #4CAF50;
      color: white;
    }
    .test-status.fail {
      background: #f44336;
      color: white;
    }
    .test-description {
      color: #aaa;
      margin-bottom: 10px;
    }
    .test-error {
      background: #3a1a1a;
      border-left: 3px solid #f44336;
      padding: 15px;
      border-radius: 4px;
      margin-top: 10px;
      color: #ffaaaa;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
    }
    .test-data {
      background: #1a2a1a;
      border-left: 3px solid #4CAF50;
      padding: 15px;
      border-radius: 4px;
      margin-top: 10px;
      color: #aaffaa;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
    }
    .test-duration {
      color: #888;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #333;
      color: #888;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Meta System TDD Report</h1>
    <div class="subtitle">Generated: ${timestamp}</div>
    
    <div class="stats">
      <div class="stat-card ${failed > 0 ? 'failed' : ''}">
        <h3>Total Tests</h3>
        <div class="value">${results.length}</div>
      </div>
      <div class="stat-card">
        <h3>Passed</h3>
        <div class="value" style="color: #4CAF50;">${passed}</div>
      </div>
      <div class="stat-card ${failed > 0 ? 'failed' : ''}">
        <h3>Failed</h3>
        <div class="value" style="color: #f44336;">${failed}</div>
      </div>
      <div class="stat-card">
        <h3>Pass Rate</h3>
        <div class="value">${passRate}%</div>
      </div>
      <div class="stat-card">
        <h3>Duration</h3>
        <div class="value">${(totalDuration / 1000).toFixed(2)}s</div>
      </div>
    </div>
    
    ${Array.from(resultsBySuite.entries()).map(([suite, suiteResults]) => `
      <h2 style="margin-top: 40px; margin-bottom: 20px; color: #4CAF50; font-size: 1.5em; border-bottom: 2px solid #333; padding-bottom: 10px;">${suite}</h2>
      <div class="test-list">
        ${suiteResults.map(result => `
          <div class="test-item ${result.success ? '' : 'failed'}">
            <div class="test-header">
              <div class="test-name">${result.name}</div>
              <div class="test-status ${result.success ? 'pass' : 'fail'}">
                ${result.success ? '✓ PASS' : '✗ FAIL'}
              </div>
            </div>
            <div class="test-description">${result.description}</div>
            ${result.duration ? `<div class="test-duration">Duration: ${result.duration}ms</div>` : ''}
            ${result.error ? `<div class="test-error">${result.error}</div>` : ''}
            ${result.data ? `<div class="test-data">${JSON.stringify(result.data, null, 2)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('')}
    
    <div class="footer">
      <p>Meta System Validation Test Suite</p>
      <p>Phase 8: Validation & Testing</p>
    </div>
  </div>
</body>
</html>`;
}

function openInBrowser(filePath: string): void {
  const platform = process.platform;
  let command: string;
  
  if (platform === 'win32') {
    command = `start "" "${filePath}"`;
  } else if (platform === 'darwin') {
    command = `open "${filePath}"`;
  } else {
    command = `xdg-open "${filePath}"`;
  }
  
  exec(command, (error) => {
    if (error) {
      console.log(`\n⚠️  Could not open browser automatically. Please open: ${filePath}`);
    } else {
      console.log(`\n🌐 Opened report in browser`);
    }
  });
}

async function main() {
  const startTime = Date.now();
  const { results, passed, failed } = await runComprehensiveTests();
  const totalDuration = Date.now() - startTime;
  
  const report = generateHTMLReport(results, passed, failed, totalDuration);
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n✅ Report saved to: ${reportPath}`);
  
  openInBrowser(reportPath);
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

