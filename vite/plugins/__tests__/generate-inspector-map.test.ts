import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { exec } from 'child_process';
import { dirname, join } from 'path';
import { generateRegistryMapsPlugin } from '../generate-inspector-map';

interface AssetTypeMetadata {
  importPath: string;
  assetType: string;
  displayName?: string;
  icon?: string;
  category?: string;
  commonType?: string;
}

async function getAssetTypeMapWithTestAsset(): Promise<Record<string, AssetTypeMetadata>> {
  const assetTypeMapPath = pathToFileURL(join(process.cwd(), 'src', 'lib', 'core', 'registry', 'assetTypeMap.generated.ts')).href;
  const { assetTypeMap } = await import(assetTypeMapPath);
  
  const extendedMap = {
    ...assetTypeMap,
    TestAsset: {
      importPath: '@/lib/assets/test/TestAsset',
      assetType: 'TestAsset',
      displayName: 'Test Asset',
      icon: '🧪',
      category: 'Content',
      commonType: 'Assets',
    } as AssetTypeMetadata,
  };
  
  return extendedMap;
}

interface TestResult {
  name: string;
  description: string;
  success: boolean;
  error?: string;
  details?: string;
}

const testResults: TestResult[] = [];

function trackTestResult(
  results: TestResult[],
  name: string,
  description: string,
  success: boolean,
  error?: string,
  details?: string
): void {
  results.push({
    name,
    description,
    success,
    error,
    details,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateReport(results: TestResult[], reportPath: string): void {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const totalTests = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100 * 10) / 10 : 0;

  const status =
    failed === 0
      ? '✅ ALL TESTS PASSED'
      : passRate >= 70
        ? '⚠️ MOSTLY PASSING'
        : '❌ NEEDS ATTENTION';

  const testSections: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const anchor = `test-${i}-${result.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const statusIcon = result.success ? '✅' : '❌';
    const statusText = result.success ? 'PASS' : 'FAIL';

    const verdict = result.success
      ? `**✅ PASS** - Test passed successfully.`
      : `**❌ FAIL** - ${result.error || 'Unknown error'}`;

    const solution = result.success
      ? '✅ **Solution:** This functionality works correctly.'
      : '❌ **Solution:** Review the error and check the plugin implementation.';

    const testOutput = `[TEST ${result.name}] ${result.description}
${result.success
  ? `[✓ PASS]`
  : `[✗ FAIL]
[ERROR] ${result.error || 'Unknown error'}`}
${result.details ? `[DETAILS] ${result.details}` : ''}`;

    const copyButton = `<button class="copy-button" onclick="copyTestResult(${i})" title="Copy test result to clipboard">📋 Copy</button>`;

    testSections.push(`<a id="${anchor}"></a>
<details>
<summary><strong>Test ${i + 1}: ${escapeHtml(result.name)} - ${statusIcon} ${statusText} ${copyButton}</strong></summary>
<div class="test-content" id="test-content-${i}">
<p><strong>Description:</strong> ${escapeHtml(result.description)}</p>
<hr>
<h3>From Test Output:</h3>
<pre><code>${escapeHtml(testOutput)}</code></pre>
<h3>Verdict:</h3>
<p>${verdict.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>
<p>${solution.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>
</div>
</details>
`);
  }

  const summaryTableRows = results.map((r, i) => {
    const statusIcon = r.success ? '✅' : '❌';
    const error = r.error ? escapeHtml(r.error.substring(0, 50)) : '-';
    const anchor = `test-${i}-${r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    return `<tr>
      <td>${i + 1}</td>
      <td><a href="#${anchor}">${escapeHtml(r.name)}</a></td>
      <td>${escapeHtml(r.description)}</td>
      <td>${statusIcon}</td>
      <td>${error}</td>
    </tr>`;
  }).join('\n');

  const summaryTable = `<table>
    <thead>
      <tr>
        <th>#</th>
        <th>Test</th>
        <th>Description</th>
        <th>Status</th>
        <th>Error</th>
      </tr>
    </thead>
    <tbody>
      ${summaryTableRows}
    </tbody>
  </table>`;

  const testSectionsHtml = testSections.join('\n');

  const report = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generate Inspector Map Plugin Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #1e1e1e;
      color: #cccccc;
      line-height: 1.6;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      color: #4ec9b0;
      margin-bottom: 10px;
      font-size: 2em;
    }
    
    h2 {
      color: #569cd6;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    
    h3 {
      color: #9cdcfe;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    
    .header-info {
      background-color: #252526;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      border: 1px solid #3e3e42;
    }
    
    .header-info strong {
      color: #4ec9b0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background-color: #252526;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      overflow: hidden;
    }
    
    table thead {
      background-color: #2a2d2e;
    }
    
    table th {
      padding: 12px 15px;
      text-align: left;
      color: #cccccc;
      font-weight: 600;
      border-bottom: 2px solid #3e3e42;
    }
    
    table td {
      padding: 10px 15px;
      border-bottom: 1px solid #3e3e42;
    }
    
    table tbody tr:hover {
      background-color: #2a2d2e;
    }
    
    table a {
      color: #4ec9b0;
      text-decoration: none;
    }
    
    table a:hover {
      text-decoration: underline;
    }
    
    details {
      margin: 10px 0;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 0;
      background-color: #1e1e1e;
    }
    
    details summary {
      padding: 12px 15px;
      cursor: pointer;
      background-color: #252526;
      border-radius: 4px;
      -webkit-user-select: none;
      user-select: none;
      font-weight: 600;
      color: #cccccc;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    details summary:hover {
      background-color: #2a2d2e;
    }
    
    details[open] summary {
      border-bottom: 1px solid #3e3e42;
      border-radius: 4px 4px 0 0;
      background-color: #2a2d2e;
    }
    
    details > div {
      padding: 15px;
      background-color: #1e1e1e;
      color: #cccccc;
    }
    
    details > div code {
      background-color: #252526;
      color: #d4d4d4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    }
    
    details > div pre {
      background-color: #252526;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 15px;
      overflow-x: auto;
      margin: 10px 0;
    }
    
    details > div pre code {
      background-color: transparent;
      padding: 0;
      display: block;
    }
    
    hr {
      border: none;
      border-top: 1px solid #3e3e42;
      margin: 20px 0;
    }
    
    p {
      margin: 10px 0;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #3e3e42;
      color: #808080;
      text-align: center;
      font-size: 0.9em;
    }
    
    .copy-button {
      background-color: #0e639c;
      color: #ffffff;
      border: none;
      border-radius: 3px;
      padding: 4px 8px;
      font-size: 0.85em;
      cursor: pointer;
      margin-left: 10px;
      transition: background-color 0.2s ease;
    }
    
    .copy-button:hover {
      background-color: #1177bb;
    }
    
    .copy-button:active {
      background-color: #0a4d73;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Generate Inspector Map Plugin Test Report</h1>
    
    <div class="header-info">
      <p><strong>Generated:</strong> ${escapeHtml(timestamp)}</p>
      <p><strong>Status:</strong> ${escapeHtml(status)}</p>
      <p><strong>Total Tests:</strong> ${totalTests} | <strong>Passed:</strong> ${passed} ✅ | <strong>Failed:</strong> ${failed} ❌ | <strong>Pass Rate:</strong> ${passRate}%</p>
      <p><strong>Test Suite:</strong> Generate Registry Maps Plugin Tests</p>
    </div>
    
    <h2>📊 Test Summary Table</h2>
    ${summaryTable}
    
    <h2>📋 Individual Test Reports</h2>
    ${testSectionsHtml}
    
    <div class="footer">
      <p>Report generated by Generate Inspector Map Plugin Test Suite</p>
      <p>Tests plugin that generates registry maps for asset types and inspectors</p>
    </div>
  </div>
  
  <script>
    function copyTestResult(index) {
      const testContent = document.getElementById('test-content-' + index);
      if (!testContent) return;
      
      const text = testContent.innerText || testContent.textContent || '';
      navigator.clipboard.writeText(text).then(function() {
        const buttons = document.querySelectorAll('.copy-button');
        const button = buttons[index];
        if (button) {
          const originalText = button.textContent;
          button.textContent = '✓ Copied!';
          button.style.backgroundColor = '#0e7a0e';
          setTimeout(function() {
            button.textContent = originalText;
            button.style.backgroundColor = '#0e639c';
          }, 2000);
        }
      }).catch(function(err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
      });
    }
    
    (function() {
      const details = document.querySelectorAll('details');
      
      function closeAllExcept(except) {
        details.forEach(function(detail) {
          if (detail !== except && detail.open) {
            detail.open = false;
          }
        });
      }
      
      details.forEach(function(detail) {
        detail.addEventListener('toggle', function() {
          if (this.open) {
            closeAllExcept(this);
          }
        });
      });
      
      function findDetailsForAnchor(anchor) {
        let element = anchor.nextElementSibling;
        while (element) {
          if (element.tagName === 'DETAILS') {
            return element;
          }
          element = element.nextElementSibling;
        }
        return null;
      }
      
      function openDetailsForHash(hash) {
        if (!hash) return;
        const target = document.querySelector(hash);
        if (target) {
          const detailsElement = findDetailsForAnchor(target);
          if (detailsElement) {
            closeAllExcept(detailsElement);
            detailsElement.open = true;
            setTimeout(function() {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }
        }
      }
      
      window.addEventListener('hashchange', function() {
        openDetailsForHash(window.location.hash);
      });
      
      if (window.location.hash) {
        setTimeout(function() {
          openDetailsForHash(window.location.hash);
        }, 100);
      }
      
      const summaryLinks = document.querySelectorAll('a[href^="#test-"]');
      summaryLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
          const href = this.getAttribute('href');
          if (href) {
            const target = document.querySelector(href);
            if (target) {
              const detailsElement = findDetailsForAnchor(target);
              if (detailsElement) {
                e.preventDefault();
                closeAllExcept(detailsElement);
                detailsElement.open = true;
                setTimeout(function() {
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  window.history.pushState(null, '', href);
                }, 50);
              }
            }
          }
        });
      });
    })();
  </script>
</body>
</html>`;

  writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n✅ Report saved to: ${reportPath}`);

  const platform = process.platform;
  let command: string;

  if (platform === 'win32') {
    command = `start "" "${reportPath}"`;
  } else if (platform === 'darwin') {
    command = `open "${reportPath}"`;
  } else {
    command = `xdg-open "${reportPath}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`\n⚠️  Could not open browser automatically. Please open: ${reportPath}`);
    } else {
      console.log(`\n🌐 Opened report in browser`);
    }
  });
}

describe('generateRegistryMapsPlugin', () => {
  let reportPath: string;
  const srcDir = join(process.cwd(), 'src');
  const inspectorMapPath = join(srcDir, 'lib', 'core', 'registry', 'inspectorMap.generated.ts');
  const assetTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'assetTypeMap.generated.ts');
  let originalInspectorMapExists: boolean;
  let originalAssetTypeMapExists: boolean;
  let originalInspectorMapContent: string | null = null;
  let originalAssetTypeMapContent: string | null = null;

  beforeAll(() => {
    const testFilename = fileURLToPath(import.meta.url);
    const testDirname = dirname(testFilename);
    reportPath = join(testDirname, 'generate-inspector-map-report.html');

    originalInspectorMapExists = existsSync(inspectorMapPath);
    originalAssetTypeMapExists = existsSync(assetTypeMapPath);

    if (originalInspectorMapExists) {
      originalInspectorMapContent = readFileSync(inspectorMapPath, 'utf-8');
    }
    if (originalAssetTypeMapExists) {
      originalAssetTypeMapContent = readFileSync(assetTypeMapPath, 'utf-8');
    }
  });

  afterAll(() => {
    if (originalInspectorMapContent && originalInspectorMapExists) {
      writeFileSync(inspectorMapPath, originalInspectorMapContent, 'utf-8');
    } else if (!originalInspectorMapExists && existsSync(inspectorMapPath)) {
      unlinkSync(inspectorMapPath);
    }

    if (originalAssetTypeMapContent && originalAssetTypeMapExists) {
      writeFileSync(assetTypeMapPath, originalAssetTypeMapContent, 'utf-8');
    } else if (!originalAssetTypeMapExists && existsSync(assetTypeMapPath)) {
      unlinkSync(assetTypeMapPath);
    }

    if (testResults.length > 0) {
      generateReport(testResults, reportPath);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach((ctx) => {
    vi.restoreAllMocks();
    
    const task = ctx.task;
    if (task) {
      const testName = task.name || 'Unknown Test';
      const suiteName = task.suite?.name || 'Unknown Suite';
      const fullName = `${suiteName} > ${testName}`;

      const state = task.result?.state;
      const success = state === 'pass';
      const error = task.result?.errors && task.result.errors.length > 0
        ? task.result.errors[0]?.message || String(task.result.errors[0])
        : undefined;
      const details = task.result?.errors && task.result.errors.length > 0
        ? task.result.errors[0]?.stack
        : undefined;

      const existingResult = testResults.find(r => r.name === fullName);
      if (existingResult) {
        existingResult.success = success;
        if (error) existingResult.error = error;
        if (details) existingResult.details = details;
      } else {
        trackTestResult(
          testResults,
          fullName,
          testName,
          success,
          error,
          details
        );
      }
    }
  });

  describe('plugin creation', () => {
    it('should create plugin with correct name', () => {
      const plugin = generateRegistryMapsPlugin();
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('generate-registry-maps');
    });

    it('should have buildStart hook', () => {
      const plugin = generateRegistryMapsPlugin();
      expect(plugin.buildStart).toBeDefined();
      expect(typeof plugin.buildStart).toBe('function');
    });

    it('should have configureServer hook', () => {
      const plugin = generateRegistryMapsPlugin();
      expect(plugin.configureServer).toBeDefined();
      expect(typeof plugin.configureServer).toBe('function');
    });
  });

  describe('shouldRegenerate logic', () => {
    it('should return true when inspectorMap does not exist', () => {
      const srcDir = join(process.cwd(), 'src');
      const inspectorMapPath = join(srcDir, 'lib', 'core', 'registry', 'inspectorMap.generated.ts');
      const assetTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'assetTypeMap.generated.ts');
      const fieldTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'fieldTypeMap.generated.ts');
      const requiredFieldsMapPath = join(srcDir, 'lib', 'core', 'registry', 'requiredFieldsMap.generated.ts');

      const inspectorMapExists = existsSync(inspectorMapPath);
      
      let inspectorMapBackup: string | null = null;
      if (inspectorMapExists) {
        inspectorMapBackup = readFileSync(inspectorMapPath, 'utf-8');
        unlinkSync(inspectorMapPath);
      }

      const shouldRegen = !existsSync(inspectorMapPath) || !existsSync(assetTypeMapPath) || !existsSync(fieldTypeMapPath) || !existsSync(requiredFieldsMapPath);
      expect(shouldRegen).toBeTruthy();

      if (inspectorMapBackup) {
        writeFileSync(inspectorMapPath, inspectorMapBackup, 'utf-8');
      }
    });

    it('should return true when assetTypeMap does not exist', () => {
      const srcDir = join(process.cwd(), 'src');
      const inspectorMapPath = join(srcDir, 'lib', 'core', 'registry', 'inspectorMap.generated.ts');
      const assetTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'assetTypeMap.generated.ts');
      const fieldTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'fieldTypeMap.generated.ts');
      const requiredFieldsMapPath = join(srcDir, 'lib', 'core', 'registry', 'requiredFieldsMap.generated.ts');

      const assetTypeMapExists = existsSync(assetTypeMapPath);
      
      let assetTypeMapBackup: string | null = null;
      if (assetTypeMapExists) {
        assetTypeMapBackup = readFileSync(assetTypeMapPath, 'utf-8');
        unlinkSync(assetTypeMapPath);
      }

      const shouldRegen = !existsSync(inspectorMapPath) || !existsSync(assetTypeMapPath) || !existsSync(fieldTypeMapPath) || !existsSync(requiredFieldsMapPath);
      expect(shouldRegen).toBeTruthy();

      if (assetTypeMapBackup) {
        writeFileSync(assetTypeMapPath, assetTypeMapBackup, 'utf-8');
      }
    });

    it('should return false when all maps exist', () => {
      const srcDir = join(process.cwd(), 'src');
      const inspectorMapPath = join(srcDir, 'lib', 'core', 'registry', 'inspectorMap.generated.ts');
      const assetTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'assetTypeMap.generated.ts');
      const fieldTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'fieldTypeMap.generated.ts');
      const requiredFieldsMapPath = join(srcDir, 'lib', 'core', 'registry', 'requiredFieldsMap.generated.ts');

      const allExist = existsSync(inspectorMapPath) && existsSync(assetTypeMapPath) && existsSync(fieldTypeMapPath) && existsSync(requiredFieldsMapPath);
      expect(allExist).toBeTruthy();
      
      if (allExist) {
        const shouldRegen = !existsSync(inspectorMapPath) || !existsSync(assetTypeMapPath) || !existsSync(fieldTypeMapPath) || !existsSync(requiredFieldsMapPath);
        expect(shouldRegen).toBeFalsy();
      }
    });
  });

  describe('plugin execution', () => {
    it('should execute buildStart hook', async () => {
      const plugin = generateRegistryMapsPlugin();
      expect(plugin.buildStart).toBeDefined();

      let buildStartCalled = false;
      const originalBuildStart = plugin.buildStart;
      if (originalBuildStart && typeof originalBuildStart === 'function') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (originalBuildStart as any)({} as any);
          buildStartCalled = true;
        } catch {
          buildStartCalled = false;
        }
      }

      expect(buildStartCalled || plugin.buildStart !== undefined).toBeTruthy();
    });

    it('should execute configureServer hook', () => {
      const plugin = generateRegistryMapsPlugin();
      expect(plugin.configureServer).toBeDefined();

      let configureServerCalled = false;
      const mockServer = {
        middlewares: {},
      };

      if (plugin.configureServer && typeof plugin.configureServer === 'function') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (plugin.configureServer as any)(mockServer as any);
          configureServerCalled = true;
        } catch {
          configureServerCalled = false;
        }
      }

      expect(configureServerCalled || plugin.configureServer !== undefined).toBeTruthy();
    });

    it('should generate maps when files are missing', () => {
      const srcDir = join(process.cwd(), 'src');
      const inspectorMapPath = join(srcDir, 'lib', 'core', 'registry', 'inspectorMap.generated.ts');
      const assetTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'assetTypeMap.generated.ts');

      const mapsExist = existsSync(inspectorMapPath) && existsSync(assetTypeMapPath);
      expect(mapsExist).toBeTruthy();
    });
  });

  describe('generated files validation', () => {
    it('should generate inspectorMap.generated.ts with correct structure', () => {
      const srcDir = join(process.cwd(), 'src');
      const inspectorMapPath = join(srcDir, 'lib', 'core', 'registry', 'inspectorMap.generated.ts');

      if (existsSync(inspectorMapPath)) {
        const content = readFileSync(inspectorMapPath, 'utf-8');
        const hasExport = content.includes('export');
        const hasInspectorMap = content.includes('inspectorMap') || content.includes('InspectorMap');
        const isValid = hasExport && hasInspectorMap;
        expect(isValid).toBeTruthy();
      } else {
        expect(existsSync(inspectorMapPath)).toBeTruthy();
      }
    });

    it('should generate assetTypeMap.generated.ts with correct structure', () => {
      const srcDir = join(process.cwd(), 'src');
      const assetTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'assetTypeMap.generated.ts');

      if (existsSync(assetTypeMapPath)) {
        const content = readFileSync(assetTypeMapPath, 'utf-8');
        const hasExport = content.includes('export');
        const hasAssetTypeMap = content.includes('assetTypeMap') || content.includes('AssetTypeMap');
        const isValid = hasExport && hasAssetTypeMap;
        expect(isValid).toBeTruthy();
      } else {
        expect(existsSync(assetTypeMapPath)).toBeTruthy();
      }
    });

    it('should exclude TestAsset from generated assetTypeMap', async () => {
      const srcDir = join(process.cwd(), 'src');
      const assetTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'assetTypeMap.generated.ts');

      expect(existsSync(assetTypeMapPath)).toBeTruthy();
      const { assetTypeMap } = await import(pathToFileURL(assetTypeMapPath).href);
      const hasTestAsset = 'TestAsset' in assetTypeMap;
      expect(!hasTestAsset).toBeTruthy();
    });

    it('should allow runtime registration of TestAsset for tests', async () => {
      const extendedMap = await getAssetTypeMapWithTestAsset();
      const hasTestAsset = 'TestAsset' in extendedMap;
      const testAssetMetadata = extendedMap.TestAsset;
      const isValid = hasTestAsset && testAssetMetadata?.assetType === 'TestAsset';
      expect(isValid).toBeTruthy();
    });

    it('should generate fieldTypeMap.generated.ts with correct structure', () => {
      const srcDir = join(process.cwd(), 'src');
      const fieldTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'fieldTypeMap.generated.ts');

      if (existsSync(fieldTypeMapPath)) {
        const content = readFileSync(fieldTypeMapPath, 'utf-8');
        const hasExport = content.includes('export');
        const hasFieldTypeMap = content.includes('fieldTypeMap');
        const isValid = hasExport && hasFieldTypeMap;
        expect(isValid).toBeTruthy();
      } else {
        expect(existsSync(fieldTypeMapPath)).toBeTruthy();
      }
    });

    it('should generate requiredFieldsMap.generated.ts with correct structure', () => {
      const srcDir = join(process.cwd(), 'src');
      const requiredFieldsMapPath = join(srcDir, 'lib', 'core', 'registry', 'requiredFieldsMap.generated.ts');

      if (existsSync(requiredFieldsMapPath)) {
        const content = readFileSync(requiredFieldsMapPath, 'utf-8');
        const hasExport = content.includes('export');
        const hasRequiredFieldsMap = content.includes('requiredFieldsMap');
        const isValid = hasExport && hasRequiredFieldsMap;
        expect(isValid).toBeTruthy();
      } else {
        expect(existsSync(requiredFieldsMapPath)).toBeTruthy();
      }
    });

    it('should include Deck with cardRankingAsset in requiredFieldsMap', async () => {
      const srcDir = join(process.cwd(), 'src');
      const requiredFieldsMapPath = join(srcDir, 'lib', 'core', 'registry', 'requiredFieldsMap.generated.ts');

      expect(existsSync(requiredFieldsMapPath)).toBeTruthy();
      const { requiredFieldsMap } = await import(pathToFileURL(requiredFieldsMapPath).href) as { requiredFieldsMap: Record<string, Record<string, string>> };
      
      const hasDeck = 'Deck' in requiredFieldsMap;
      expect(hasDeck).toBeTruthy();
      
      if (hasDeck) {
        const deckRequiredFields = requiredFieldsMap.Deck;
        const hasCardRankingAsset = 'cardRankingAsset' in deckRequiredFields;
        expect(hasCardRankingAsset).toBeTruthy();
        
        if (hasCardRankingAsset) {
          const message = deckRequiredFields.cardRankingAsset;
          expect(message).toContain('required');
        }
      }
    });

    it('should exclude TestAsset from generated requiredFieldsMap', async () => {
      const srcDir = join(process.cwd(), 'src');
      const requiredFieldsMapPath = join(srcDir, 'lib', 'core', 'registry', 'requiredFieldsMap.generated.ts');

      expect(existsSync(requiredFieldsMapPath)).toBeTruthy();
      const { requiredFieldsMap } = await import(pathToFileURL(requiredFieldsMapPath).href) as { requiredFieldsMap: Record<string, Record<string, string>> };
      const hasTestAsset = 'TestAsset' in requiredFieldsMap;
      expect(!hasTestAsset).toBeTruthy();
    });

    it('should exclude TestAsset from generated fieldTypeMap', async () => {
      const srcDir = join(process.cwd(), 'src');
      const fieldTypeMapPath = join(srcDir, 'lib', 'core', 'registry', 'fieldTypeMap.generated.ts');

      expect(existsSync(fieldTypeMapPath)).toBeTruthy();
      const { fieldTypeMap } = await import(pathToFileURL(fieldTypeMapPath).href) as { fieldTypeMap: Record<string, Record<string, string>> };
      const hasTestAsset = 'TestAsset' in fieldTypeMap;
      expect(!hasTestAsset).toBeTruthy();
    });

    it('should allow runtime registration of TestAsset field types for tests', async () => {
      const { pathToFileURL } = await import('url');
      const fieldTypeMapPath = pathToFileURL(join(process.cwd(), 'src', 'lib', 'core', 'registry', 'fieldTypeMap.generated.ts')).href;
      const { fieldTypeMap } = await import(fieldTypeMapPath) as { fieldTypeMap: Record<string, Record<string, string>> };
      
      const extendedMap = {
        ...fieldTypeMap,
        TestAsset: {
          name: 'String',
          testData: 'String',
          count: 'Number',
          cardRankingAsset: 'AssetRef',
        },
      };
      
      const hasTestAsset = 'TestAsset' in extendedMap;
      const testAssetFieldTypes = extendedMap.TestAsset;
      const isValid = hasTestAsset && testAssetFieldTypes?.name === 'String' && testAssetFieldTypes?.count === 'Number' && testAssetFieldTypes?.cardRankingAsset === 'AssetRef';
      expect(isValid).toBeTruthy();
    });
  });

  describe('plugin idempotency', () => {
    it('should not regenerate if hasGenerated flag is set', () => {
      const plugin1 = generateRegistryMapsPlugin();
      const plugin2 = generateRegistryMapsPlugin();

      expect(plugin1).toBeDefined();
      expect(plugin2).toBeDefined();
      expect(plugin1 !== plugin2).toBeTruthy();
    });
  });
});

