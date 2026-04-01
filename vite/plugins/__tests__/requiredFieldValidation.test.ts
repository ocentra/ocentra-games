import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, type TestContext } from 'vitest';
import { writeFileSync, existsSync, unlinkSync, rmSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { dirname, join } from 'path';
import JSON5 from 'json5';

interface TestResult {
  name: string;
  description: string;
  success: boolean;
  error?: string;
  details?: string;
  expectsFailure?: boolean;
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


import {
  assetValidationPlugin,
  validateFieldType,
  validateAssetRef,
  inferExpectedAssetType,
  validateAssetFile,
  validateRequiredFieldsInSource,
} from '../requiredFieldValidation';

type SerializableConstructor<T = unknown> = new () => T;

interface AssetTypeMetadata {
  importPath: string;
  assetType: string;
  displayName?: string;
  icon?: string;
  category?: string;
  commonType?: string;
}

function asAssetType(value: string): import('@ocentra/asset-domain/types/assetType').AssetType {
  return value as unknown as import('@ocentra/asset-domain/types/assetType').AssetType;
}

async function getAssetTypeMapWithTestAsset(): Promise<Record<string, AssetTypeMetadata>> {
  const { pathToFileURL } = await import('url');
  const assetTypeMapPath = pathToFileURL(join(process.cwd(), 'src', 'lib', 'core', 'registry', 'assetTypeMap.generated.ts')).href;
  const { assetTypeMap } = await import(assetTypeMapPath);
  const testAssetModulePath = pathToFileURL(
    join(process.cwd(), 'packages', 'game-asset-domain', 'src', 'test', 'TestAsset.ts')
  ).href;
  
  const extendedMap = {
    ...assetTypeMap,
    TestAsset: {
      importPath: testAssetModulePath,
      assetType: 'TestAsset',
      displayName: 'Test Asset',
      icon: '🧪',
      category: 'Content',
      commonType: 'Assets',
    } as AssetTypeMetadata,
  };
  
  return extendedMap;
}

async function getRequiredFieldsMapWithTestAsset(): Promise<Record<string, Record<string, string>>> {
  const { pathToFileURL } = await import('url');
  const requiredFieldsMapPath = pathToFileURL(join(process.cwd(), 'src', 'lib', 'core', 'registry', 'requiredFieldsMap.generated.ts')).href;
  
  try {
    const content = await import(requiredFieldsMapPath);
    return {
      ...(content.requiredFieldsMap || {}),
      TestAsset: {
        name: 'Name is required',
        count: 'Count is required',
        cardRankingAsset: 'Card Ranking Asset is required',
      },
      Deck: {
        ...(content.requiredFieldsMap?.Deck || {}),
        cardRankingAsset: content.requiredFieldsMap?.Deck?.cardRankingAsset || 'Card Ranking Asset is required for deck to function properly',
      },
    };
  } catch {
    const extendedMap = {
      TestAsset: {
        name: 'Name is required',
        count: 'Count is required',
        cardRankingAsset: 'Card Ranking Asset is required',
      },
      Deck: {
        cardRankingAsset: 'Card Ranking Asset is required for deck to function properly',
      },
    };
    return extendedMap;
  }
}

async function getFieldTypeMapWithTestAsset(): Promise<Record<string, Record<string, string>>> {
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
  
  return extendedMap;
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
    const expectsFailure = result.expectsFailure || result.name.toLowerCase().includes('should fail') || (result.name.toLowerCase().includes('should detect') && result.name.toLowerCase().includes('not initialized'));
    
    let statusIcon: string;
    let statusText: string;
    let statusClass: string;
    
    if (expectsFailure && result.success) {
      statusIcon = '✅ 🎯';
      statusText = 'PASS (Expected Failure)';
      statusClass = 'expects-failure-pass';
    } else if (result.success) {
      statusIcon = '✅';
      statusText = 'PASS';
      statusClass = 'pass';
    } else {
      statusIcon = '❌';
      statusText = 'FAIL';
      statusClass = 'fail';
    }

    let verdict: string;
    let solution: string;
    
    if (expectsFailure && result.success) {
      verdict = `**✅ 🎯 PASS (Expected Failure)** - Test passed because validation correctly detected the expected error.`;
      solution = '✅ 🎯 **Note:** This test expects validation to fail and print errors. The validation correctly found errors, so the test passes.';
    } else if (result.success) {
      verdict = `**✅ PASS** - Test passed successfully.`;
      solution = '✅ **Solution:** This validation works correctly.';
    } else {
      verdict = `**❌ FAIL** - ${result.error || 'Unknown error'}`;
      solution = '❌ **Solution:** Review the error and check the validation implementation.';
    }

    const testOutput = `[TEST ${result.name}] ${result.description}
${result.success
  ? `[✓ PASS]`
  : `[✗ FAIL]
[ERROR] ${result.error || 'Unknown error'}`}
${result.details ? `[DETAILS] ${result.details}` : ''}`;

    const copyButton = `<button class="copy-button" onclick="copyTestResult(${i})" title="Copy test result to clipboard">📋 Copy</button>`;

    testSections.push(`<a id="${anchor}"></a>
<details class="${statusClass}">
<summary><strong>Test ${i + 1}: ${escapeHtml(result.name)} - ${statusIcon} ${statusText} ${copyButton}</strong></summary>
<div class="test-content" id="test-content-${i}">
<p><strong>Description:</strong> ${escapeHtml(result.description)}</p>
${expectsFailure ? '<p class="expects-failure-note"><strong>✅ 🎯 Note:</strong> This test expects validation to fail. Validation correctly detected errors, so the test passes.</p>' : ''}
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
    const expectsFailure = r.expectsFailure || r.name.toLowerCase().includes('should fail') || (r.name.toLowerCase().includes('should detect') && r.name.toLowerCase().includes('not initialized'));
    
    let statusIcon: string;
    let statusClass: string;
    
    if (expectsFailure && r.success) {
      statusIcon = '✅ 🎯';
      statusClass = 'expects-failure-pass';
    } else if (r.success) {
      statusIcon = '✅';
      statusClass = 'pass';
    } else {
      statusIcon = '❌';
      statusClass = 'fail';
    }
    
    const error = r.error ? escapeHtml(r.error.substring(0, 50)) : '-';
    const anchor = `test-${i}-${r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    return `<tr class="${statusClass}">
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
  <title>Required Field Validation Test Report</title>
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
    
    details.expects-failure-pass {
      border-left: 4px solid #ffa500;
    }
    
    details.expects-failure-pass summary {
      background-color: #2a2317;
      border-left: 4px solid #ffa500;
    }
    
    details.expects-failure-pass[open] summary {
      background-color: #3a2d1f;
      border-left: 4px solid #ffa500;
    }
    
    details.expects-failure-pass .expects-failure-note {
      background-color: #2a2317;
      border: 1px solid #ffa500;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
      color: #ffb84d;
    }
    
    table tbody tr.expects-failure-pass {
      border-left: 4px solid #ffa500;
      background-color: #2a2317;
    }
    
    table tbody tr.expects-failure-pass:hover {
      background-color: #3a2d1f;
    }
    
    table tbody tr.pass {
      border-left: 4px solid #4ec9b0;
    }
    
    table tbody tr.fail {
      border-left: 4px solid #f48771;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Required Field Validation Test Report</h1>
    
    <div class="header-info">
      <p><strong>Generated:</strong> ${escapeHtml(timestamp)}</p>
      <p><strong>Status:</strong> ${escapeHtml(status)}</p>
      <p><strong>Total Tests:</strong> ${totalTests} | <strong>Passed:</strong> ${passed} ✅ | <strong>Failed:</strong> ${failed} ❌ | <strong>Pass Rate:</strong> ${passRate}%</p>
      <p><strong>Test Suite:</strong> Required Field Validation Plugin Tests</p>
    </div>
    
    <h2>📊 Test Summary Table</h2>
    ${summaryTable}
    
    <h2>📋 Individual Test Reports</h2>
    ${testSectionsHtml}
    
    <div class="footer">
      <p>Report generated by Required Field Validation Test Suite</p>
      <p>Validates @required fields in source code and asset files, field types, and AssetRef references</p>
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
            const target = document.querySelector(hash);
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

describe('requiredFieldValidation', () => {
  const testAssetsDir = join(process.cwd(), 'packages', 'asset-editor', 'Resources', '__test_validation__');
  const createdAssets: string[] = [];
  let reportPath: string;
  let pluginDir: string;
  
  const cardRankingGuid = '87654321-4321-4321-4321-cba987654321';
  const wordGameGuid = '11111111-1111-1111-1111-111111111111';

  beforeAll(() => {
    const testFilename = fileURLToPath(import.meta.url);
    const testDirname = dirname(testFilename);
    reportPath = join(testDirname, 'required-field-validation-report.html');
    pluginDir = join(testDirname, '..');

    if (existsSync(testAssetsDir)) {
      rmSync(testAssetsDir, { recursive: true, force: true });
    }
    mkdirSync(testAssetsDir, { recursive: true });

    const cardRankingAsset = {
      system: {
        guid: cardRankingGuid,
        assetType: 'CardRanking',
        schemaVersion: 1,
        displayName: 'Test Card Ranking',
        category: 'Game',
      },
      data: {
        suits: [],
        rankings: [],
      },
    };

    const wordGameAsset = {
      system: {
        guid: wordGameGuid,
        assetType: 'WordGame',
        schemaVersion: 1,
        displayName: 'Test Word Game',
        category: 'Game',
      },
      data: {
        name: 'Test Word Game',
      },
    };

    const cardRankingPath = join(testAssetsDir, `${cardRankingGuid}.asset`);
    const wordGamePath = join(testAssetsDir, `${wordGameGuid}.asset`);

    writeFileSync(cardRankingPath, JSON.stringify(cardRankingAsset, null, 2), 'utf-8');
    writeFileSync(wordGamePath, JSON.stringify(wordGameAsset, null, 2), 'utf-8');

    createdAssets.push(cardRankingPath);
    createdAssets.push(wordGamePath);
  });

  beforeEach(() => {
    if (!existsSync(testAssetsDir)) {
      mkdirSync(testAssetsDir, { recursive: true });
    }
  });

  afterEach((ctx: TestContext) => {
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

    const testCreatedFiles = createdAssets.filter(path => 
      path.includes('test-') && 
      !path.includes(cardRankingGuid) && 
      !path.includes(wordGameGuid)
    );
    
    for (const assetPath of testCreatedFiles) {
      try {
        if (existsSync(assetPath)) {
          unlinkSync(assetPath);
        }
        const metaPath = `${assetPath}.meta`;
        if (existsSync(metaPath)) {
          unlinkSync(metaPath);
        }
        const index = createdAssets.indexOf(assetPath);
        if (index > -1) {
          createdAssets.splice(index, 1);
        }
      } catch (error) {
        console.warn(`Failed to clean up asset ${assetPath}:`, error);
      }
    }
  });

  afterAll(() => {
    for (const assetPath of createdAssets) {
      try {
        if (existsSync(assetPath)) {
          unlinkSync(assetPath);
        }
        const metaPath = `${assetPath}.meta`;
        if (existsSync(metaPath)) {
          unlinkSync(metaPath);
        }
      } catch (error) {
        console.warn(`Failed to clean up asset ${assetPath}:`, error);
      }
    }

    try {
      if (existsSync(testAssetsDir)) {
        rmSync(testAssetsDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to clean up test assets directory:', error);
    }

    if (testResults.length > 0) {
      generateReport(testResults, reportPath);
    }
  });

  describe('validateFieldType', () => {
    it('should validate string fields', () => {
      const StringConstructor = String;
      const error1 = validateFieldType('name', null, StringConstructor);
      expect(error1).toBeTruthy();
      expect(error1?.message).toContain('is required');

      const error2 = validateFieldType('name', '', StringConstructor);
      expect(error2).toBeTruthy();
      expect(error2?.message).toContain('cannot be empty');

      const error3 = validateFieldType('name', 123, StringConstructor);
      expect(error3).toBeTruthy();
      expect(error3?.message).toContain('must be a string');

      const valid = validateFieldType('name', 'valid name', StringConstructor);
      expect(valid).toBeNull();

    });

    it('should validate string edge cases', () => {
      const StringConstructor = String;
      const whitespaceError = validateFieldType('name', '   ', StringConstructor);
      expect(whitespaceError).toBeTruthy();
      expect(whitespaceError?.message).toContain('cannot be empty');

      const longString = 'a'.repeat(10000);
      const longStringValid = validateFieldType('name', longString, StringConstructor);
      expect(longStringValid).toBeNull();

      const specialCharsValid = validateFieldType('name', '!@#$%^&*()', StringConstructor);
      expect(specialCharsValid).toBeNull();

      const unicodeValid = validateFieldType('name', '测试 🎮 émoji', StringConstructor);
      expect(unicodeValid).toBeNull();

    });

    it('should validate number fields', () => {
      const NumberConstructor = Number;
      const error1 = validateFieldType('count', 'not a number', NumberConstructor);
      expect(error1).toBeTruthy();
      expect(error1?.message).toContain('must be a number');

      const valid = validateFieldType('count', 42, NumberConstructor);
      expect(valid).toBeNull();
    });

    it('should validate number edge cases', () => {
      const NumberConstructor = Number;
      const zeroValid = validateFieldType('count', 0, NumberConstructor);
      expect(zeroValid).toBeNull();

      const negativeValid = validateFieldType('count', -42, NumberConstructor);
      expect(negativeValid).toBeNull();

      const floatValid = validateFieldType('count', 3.14159, NumberConstructor);
      expect(floatValid).toBeNull();

      const largeNumberValid = validateFieldType('count', Number.MAX_SAFE_INTEGER, NumberConstructor);
      expect(largeNumberValid).toBeNull();

      const nanError = validateFieldType('count', NaN, NumberConstructor);
      expect(nanError).toBeNull();

      const infinityValid = validateFieldType('count', Infinity, NumberConstructor);
      expect(infinityValid).toBeNull();

    });

    it('should validate boolean fields', () => {
      const BooleanConstructor = Boolean;
      const error1 = validateFieldType('enabled', 'true', BooleanConstructor);
      expect(error1).toBeTruthy();
      expect(error1?.message).toContain('must be a boolean');

      const valid = validateFieldType('enabled', true, BooleanConstructor);
      expect(valid).toBeNull();
    });

    it('should validate boolean edge cases', () => {
      const BooleanConstructor = Boolean;
      const trueValid = validateFieldType('enabled', true, BooleanConstructor);
      expect(trueValid).toBeNull();

      const falseValid = validateFieldType('enabled', false, BooleanConstructor);
      expect(falseValid).toBeNull();

      const numberError = validateFieldType('enabled', 1, BooleanConstructor);
      expect(numberError).toBeTruthy();

      const objectError = validateFieldType('enabled', {}, BooleanConstructor);
      expect(objectError).toBeTruthy();

    });

    it('should validate array fields', () => {
      const ArrayConstructor = Array;
      const error1 = validateFieldType('items', 'not an array', ArrayConstructor);
      expect(error1).toBeTruthy();
      expect(error1?.message).toContain('must be an array');

      const valid = validateFieldType('items', [1, 2, 3], ArrayConstructor);
      expect(valid).toBeNull();
    });

    it('should validate array edge cases', () => {
      const ArrayConstructor = Array;
      const emptyArrayValid = validateFieldType('items', [], ArrayConstructor);
      expect(emptyArrayValid).toBeNull();

      const largeArray = new Array(1000).fill(0);
      const largeArrayValid = validateFieldType('items', largeArray, ArrayConstructor);
      expect(largeArrayValid).toBeNull();

      const mixedArrayValid = validateFieldType('items', [1, 'string', true, null], ArrayConstructor);
      expect(mixedArrayValid).toBeNull();

      const nestedArrayValid = validateFieldType('items', [[1, 2], [3, 4]], ArrayConstructor);
      expect(nestedArrayValid).toBeNull();

      const objectError = validateFieldType('items', {}, ArrayConstructor);
      expect(objectError).toBeTruthy();

    });

    it('should validate AssetRef as field type', () => {
      const AssetRefConstructor = { name: 'AssetRef' } as SerializableConstructor;
      const nullError = validateFieldType('assetRef', null, AssetRefConstructor);
      expect(nullError).toBeTruthy();
      expect(nullError?.message).toContain('is required');

      const stringError = validateFieldType('assetRef', 'not an object', AssetRefConstructor);
      expect(stringError).toBeTruthy();
      expect(stringError?.message).toContain('must be an AssetRef object');

      const validRef = { guid: '12345678-1234-1234-1234-123456789abc' };
      const validRefResult = validateFieldType('assetRef', validRef, AssetRefConstructor);
      expect(validRefResult).toBeNull();

      const invalidGuid = { guid: 'not-a-guid' };
      const invalidGuidError = validateFieldType('assetRef', invalidGuid, AssetRefConstructor);
      expect(invalidGuidError).toBeTruthy();
      expect(invalidGuidError?.message).toContain('invalid GUID format');

    });

    it('should validate custom object types', () => {
      class CustomClass {
        name = 'test';
      }
      const CustomConstructor = CustomClass as SerializableConstructor;

      const nullError = validateFieldType('custom', null, CustomConstructor);
      expect(nullError).toBeTruthy();
      expect(nullError?.message).toContain('is required');

      const stringError = validateFieldType('custom', 'not an object', CustomConstructor);
      expect(stringError).toBeTruthy();
      expect(stringError?.message).toContain('must be an object');

      const validObject = { name: 'test' };
      const validObjectResult = validateFieldType('custom', validObject, CustomConstructor);
      expect(validObjectResult).toBeNull();

    });

    it('should handle undefined designType', () => {
      const result = validateFieldType('field', 'any value', undefined);
      expect(result).toBeNull();

    });
  });

  describe('validateAssetRef - Real Files', () => {
    const nonExistentGuid = '00000000-0000-0000-0000-000000000000';

    it('should validate AssetRef GUID format', async () => {
      const invalidGuid = { guid: 'not-a-guid' };
      const error = await validateAssetRef('cardRankingAsset', invalidGuid, process.cwd());
      expect(error).toBeTruthy();
      expect(error?.message).toContain('invalid GUID format');
    });

    it('should validate AssetRef requires guid property', async () => {
      const missingGuid = { type: 'CardRanking' };
      const error = await validateAssetRef('cardRankingAsset', missingGuid, process.cwd());
      expect(error).toBeTruthy();
      expect(error?.message).toContain('must have a \'guid\' property');
    });

    it('should validate referenced asset exists', async () => {
      const error = await validateAssetRef(
        'cardRankingAsset',
        { guid: nonExistentGuid },
        process.cwd()
      );
      expect(error).toBeTruthy();
      expect(error?.message).toContain('does not exist');
    });

    it('should validate asset type matches when type is specified', async () => {
      const error = await validateAssetRef(
        'cardRankingAsset',
        { guid: wordGameGuid, type: 'CardRanking' },
        process.cwd()
      );
      expect(error).toBeTruthy();
      expect(error?.severity).toBe('error');
      expect(error?.message).toContain('references asset of type \'WordGame\' but expected \'CardRanking\'');
    });

    it('should warn when asset type inferred from field name does not match', async () => {
      const error = await validateAssetRef(
        'cardRankingAsset',
        { guid: wordGameGuid },
        process.cwd()
      );
      expect(error).toBeTruthy();
      expect(error?.severity).toBe('warning');
      expect(error?.message).toContain('references asset of type \'WordGame\' but expected \'CardRanking\'');
    });

    it('should pass when asset type matches', async () => {
      const error = await validateAssetRef(
        'cardRankingAsset',
        { guid: cardRankingGuid, type: 'CardRanking' },
        process.cwd()
      );
      expect(error).toBeNull();
    });

    it('should pass when asset type matches inferred type', async () => {
      const error = await validateAssetRef(
        'cardRankingAsset',
        { guid: cardRankingGuid },
        process.cwd()
      );
      expect(error).toBeNull();
    });
  });

  describe('validateAssetFile - Real Files', () => {
    it('should validate required fields are present', async () => {
      const testGuid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const assetPath = join(testAssetsDir, `test-missing-name-${testGuid}.asset`);

      const assetContentMissingName = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Test Missing Name',
          category: 'Content',
        },
        data: {
          count: 42,
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetContentMissingName, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const error = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      const hasNameError = error?.errors.some(e => e.field === 'name');
      expect(hasNameError).toBeTruthy();
    });

    it('should validate field types', async () => {
      const testGuid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const assetPath = join(testAssetsDir, `test-wrong-type-${testGuid}.asset`);

      const assetContentWrongType = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Test Wrong Type',
          category: 'Content',
        },
        data: {
          name: 'Test Asset',
          count: 'not a number',
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetContentWrongType, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const error = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(error).toBeTruthy();
      expect(error?.errors.length).toBeGreaterThan(0);
      const countError = error?.errors.find(e => e.field === 'count');
      expect(countError).toBeTruthy();
      const hasTypeError = countError?.message.includes('must be a number');
      expect(hasTypeError).toBeTruthy();
    });

    it('should validate AssetRef with wrong asset type', async () => {
      const testGuid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      const wordGameGuid = '11111111-1111-1111-1111-111111111111';
      const assetPath = join(testAssetsDir, `test-wrong-assetref-${testGuid}.asset`);

      const assetContentWrongAssetRef = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Test Wrong AssetRef',
          category: 'Content',
        },
        data: {
          name: 'Test Asset',
          count: 42,
          cardRankingAsset: {
            guid: wordGameGuid,
            type: 'CardRanking',
          },
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetContentWrongAssetRef, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const error = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(error).toBeTruthy();
      expect(error?.errors.length).toBeGreaterThan(0);
      const assetRefError = error?.errors.find(e => e.field === 'cardRankingAsset');
      expect(assetRefError).toBeTruthy();
      const hasTypeMismatch = assetRefError?.message.includes('references asset of type \'WordGame\' but expected \'CardRanking\'');
      expect(hasTypeMismatch).toBeTruthy();
    });

    it('should pass validation for valid asset', async () => {
      const testGuid = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
      const cardRankingGuid = '87654321-4321-4321-4321-cba987654321';
      const assetPath = join(testAssetsDir, `test-valid-${testGuid}.asset`);

      const validAsset = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Test Valid Asset',
          category: 'Content',
          treePath: 'Resources/__test_validation__/test-valid.asset',
        },
        data: {
          name: 'Valid Test Asset',
          count: 42,
          cardRankingAsset: {
            guid: cardRankingGuid,
            type: 'CardRanking',
          },
        },
      };

      writeFileSync(assetPath, JSON.stringify(validAsset, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const error = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(error).toBeNull();
    });

    it('should detect multiple validation errors in one asset', async () => {
      const testGuid = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
      const assetPath = join(testAssetsDir, `test-multiple-errors-${testGuid}.asset`);

      const assetWithMultipleErrors = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Test Multiple Errors',
          category: 'Content',
        },
        data: {
          name: '',
          count: 'not a number',
          cardRankingAsset: {
            guid: 'invalid-guid',
          },
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetWithMultipleErrors, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const error = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(error).toBeTruthy();
      expect(error?.errors.length).toBeGreaterThanOrEqual(3);
      const errorFields = error?.errors.map(e => e.field) || [];
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('count');
      expect(errorFields).toContain('cardRankingAsset');
    });

    it('should handle missing system.assetType', async () => {
      const testGuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const assetPath = join(testAssetsDir, `test-missing-assettype-${testGuid}.asset`);

      const assetMissingAssetType = {
        system: {
          guid: testGuid,
          schemaVersion: 1,
          displayName: 'Test Missing AssetType',
          category: 'Content',
        },
        data: {
          name: 'Test',
          count: 42,
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetMissingAssetType, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const error = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(error).toBeTruthy();
      expect(error?.errors.some(e => e.field === 'system.assetType')).toBeTruthy();
    });

    it('should handle missing data section', async () => {
      const testGuid = 'gggggggg-gggg-gggg-gggg-gggggggggggg';
      const assetPath = join(testAssetsDir, `test-missing-data-${testGuid}.asset`);

      const assetMissingData = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Test Missing Data',
          category: 'Content',
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetMissingData, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const error = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(error).toBeTruthy();
      const hasRequiredFieldErrors = error?.errors.some(e => e.field === 'name' || e.field === 'count' || e.field === 'cardRankingAsset');
      expect(hasRequiredFieldErrors).toBeTruthy();
    });

    it('should handle empty array fields', async () => {
      const testGuid = 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh';
      const assetPath = join(testAssetsDir, `test-empty-array-${testGuid}.asset`);

      const assetWithEmptyArray = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Test Empty Array',
          category: 'Content',
          treePath: 'Resources/__test_validation__/test-empty-array.asset',
        },
        data: {
          name: 'Test',
          count: 42,
          cardRankingAsset: {
            guid: cardRankingGuid,
            type: 'CardRanking',
          },
          items: [],
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetWithEmptyArray, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const error = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(error).toBeNull();
    });
  });

  describe('inferExpectedAssetType', () => {
    it('should infer asset type from field name', () => {
      expect(inferExpectedAssetType('cardRankingAsset')).toBe('CardRanking');
      expect(inferExpectedAssetType('cardRankingRef')).toBe('CardRanking');
      expect(inferExpectedAssetType('wordGameAsset')).toBe('WordGame');
      expect(inferExpectedAssetType('deckRef')).toBe('Deck');
      expect(inferExpectedAssetType('playerSettingsAsset')).toBe('PlayerSettings');
    });

    it('should return null for fields that cannot be inferred', () => {
      expect(inferExpectedAssetType('asset')).toBeNull();
      expect(inferExpectedAssetType('ref')).toBeNull();
      expect(inferExpectedAssetType('data')).toBeNull();
    });

    it('should handle edge cases in field name inference', () => {
      expect(inferExpectedAssetType('cardRankingAssets')).toBe('CardRanking');
      expect(inferExpectedAssetType('cardRankingRefs')).toBe('CardRanking');
      expect(inferExpectedAssetType('myAssetRef')).toBe('My');
      expect(inferExpectedAssetType('testRefAsset')).toBe('Test');
      expect(inferExpectedAssetType('')).toBeNull();
      expect(inferExpectedAssetType('a')).toBeNull();

    });
  });

  describe('Integration: Serialization + Validation', () => {
    it('should validate before serializing - prevents bad data from being serialized', async () => {
      const testGuid = 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii';
      const assetPath = join(testAssetsDir, `test-bad-data-${testGuid}.asset`);

      const badAsset = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Bad Data Asset',
          category: 'Content',
        },
        data: {
          name: '',
          count: 'not a number',
          cardRankingAsset: {
            guid: 'invalid-guid',
          },
        },
      };

      writeFileSync(assetPath, JSON.stringify(badAsset, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const validationError = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(validationError).toBeTruthy();
      expect(validationError?.errors.length).toBeGreaterThan(0);
      
      const nameError = validationError?.errors.find(e => e.field === 'name');
      expect(nameError).toBeTruthy();
      expect(nameError?.message).toContain('cannot be empty');
      
      const countError = validationError?.errors.find(e => e.field === 'count');
      expect(countError).toBeTruthy();
      expect(countError?.message).toContain('must be a number');
      
      const cardRankingError = validationError?.errors.find(e => e.field === 'cardRankingAsset');
      expect(cardRankingError).toBeTruthy();
      expect(cardRankingError?.message).toContain('invalid GUID format');
    });

    it('should serialize and validate valid asset correctly', async () => {
      const { pathToFileURL: pathToFileURL2 } = await import('url');
      const testAssetPath = pathToFileURL2(join(process.cwd(), 'packages', 'game-asset-domain', 'src', 'test', 'TestAsset.ts')).href;
      const { TestAsset } = await import(testAssetPath);
      const { ScriptableObject } = await import('@ocentra/asset-domain/ScriptableObject');
      const { AssetResourceEntry } = await import('@ocentra/asset-domain/resourceEntry/AssetResourceEntry');

      const testAsset = new TestAsset();
      testAsset.treePath = 'Resources/__test_validation__/test-serialized.asset';
      testAsset.name = 'Integration Test Asset';
      testAsset.count = 100;
      testAsset.cardRankingAsset = new AssetResourceEntry(asAssetType('CardRanking'), cardRankingGuid as never);

      const serialized = testAsset.serialize();
      expect(serialized).toContain('system');
      expect(serialized).toContain('data');
      const serializedPayload = JSON5.parse(serialized);
      expect(serializedPayload.data.name).toBe('Integration Test Asset');
      expect(serializedPayload.data.count).toBe(100);

      const testGuid = 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj';
      const assetPath = join(testAssetsDir, `test-serialized-${testGuid}.asset`);

      const parsed = JSON5.parse(serialized);
      parsed.system.guid = testGuid;
      parsed.data.treePath = 'Resources/__test_validation__/test-serialized.asset';
      writeFileSync(assetPath, JSON.stringify(parsed, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const validationError = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(validationError).toBeNull();

      const deserialized = ScriptableObject.deserialize(TestAsset, serialized) as InstanceType<typeof TestAsset>;
      expect(deserialized).toBeInstanceOf(TestAsset);
      expect(deserialized.name).toBe('Integration Test Asset');
      expect(deserialized.count).toBe(100);

    });

    it('should catch validation errors that would break deserialization', async () => {
      const testGuid = 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk';
      const assetPath = join(testAssetsDir, `test-break-deserialization-${testGuid}.asset`);

      const assetWithTypeMismatch = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Type Mismatch Asset',
          category: 'Content',
        },
        data: {
          name: 'Test',
          count: 'should be number but is string',
          cardRankingAsset: {
            guid: cardRankingGuid,
            type: 'CardRanking',
          },
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetWithTypeMismatch, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const validationError = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(validationError).toBeTruthy();
      const countError = validationError?.errors.find(e => e.field === 'count');
      expect(countError).toBeTruthy();
      expect(countError?.message).toContain('must be a number');

    });

    it('should validate AssetRef before deserialization prevents broken references', async () => {
      const testGuid = 'llllllll-llll-llll-llll-llllllllllll';
      const assetPath = join(testAssetsDir, `test-broken-ref-${testGuid}.asset`);

      const assetWithBrokenRef = {
        system: {
          guid: testGuid,
          assetType: 'TestAsset',
          schemaVersion: 1,
          displayName: 'Broken Ref Asset',
          category: 'Content',
        },
        data: {
          name: 'Test',
          count: 42,
          cardRankingAsset: {
            guid: '00000000-0000-0000-0000-000000000000',
            type: 'CardRanking',
          },
        },
      };

      writeFileSync(assetPath, JSON.stringify(assetWithBrokenRef, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const validationError = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(validationError).toBeTruthy();
      const refError = validationError?.errors.find(e => e.field === 'cardRankingAsset');
      expect(refError).toBeTruthy();
      expect(refError?.message).toContain('does not exist');

    });

    it('should complete full round-trip: serialize → validate → deserialize', async () => {
      const { pathToFileURL: pathToFileURL2 } = await import('url');
      const testAssetPath = pathToFileURL2(join(process.cwd(), 'packages', 'game-asset-domain', 'src', 'test', 'TestAsset.ts')).href;
      const { TestAsset } = await import(testAssetPath);
      const { ScriptableObject } = await import('@ocentra/asset-domain/ScriptableObject');
      const { AssetResourceEntry } = await import('@ocentra/asset-domain/resourceEntry/AssetResourceEntry');

      const originalAsset = new TestAsset();
      originalAsset.treePath = 'Resources/__test_validation__/test-roundtrip.asset';
      originalAsset.name = 'Round Trip Test';
      originalAsset.count = 999;
      originalAsset.cardRankingAsset = new AssetResourceEntry(asAssetType('CardRanking'), cardRankingGuid as never);

      const serialized = originalAsset.serialize();
      const testGuid = 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';
      const assetPath = join(testAssetsDir, `test-roundtrip-${testGuid}.asset`);

      const parsed = JSON5.parse(serialized);
      parsed.system.guid = testGuid;
      parsed.data.treePath = 'Resources/__test_validation__/test-roundtrip.asset';
      writeFileSync(assetPath, JSON.stringify(parsed, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const validationError = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(validationError).toBeNull();

      const deserialized = ScriptableObject.deserialize(TestAsset, serialized) as InstanceType<typeof TestAsset>;
      expect(deserialized.name).toBe(originalAsset.name);
      expect(deserialized.count).toBe(originalAsset.count);
      expect(deserialized.cardRankingAsset.guid).toBe(originalAsset.cardRankingAsset.guid);

    });

    it('should prevent serializing asset with missing required fields', async () => {
      const { pathToFileURL: pathToFileURL2 } = await import('url');
      const testAssetPath = pathToFileURL2(join(process.cwd(), 'packages', 'game-asset-domain', 'src', 'test', 'TestAsset.ts')).href;
      const { TestAsset } = await import(testAssetPath);

      const incompleteAsset = new TestAsset();
      incompleteAsset.treePath = 'Resources/__test_validation__/test-incomplete.asset';
      incompleteAsset.name = 'Incomplete';
      incompleteAsset.count = 42;
      incompleteAsset.cardRankingAsset = undefined as unknown as { guid: string; type?: string };

      const serialized = incompleteAsset.serialize();
      const testGuid = 'nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn';
      const assetPath = join(testAssetsDir, `test-incomplete-${testGuid}.asset`);

      const parsed = JSON5.parse(serialized);
      parsed.system.guid = testGuid;
      delete parsed.data.cardRankingAsset;
      writeFileSync(assetPath, JSON.stringify(parsed, null, 2), 'utf-8');
      createdAssets.push(assetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const validationError = await validateAssetFile(
        assetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(validationError).toBeTruthy();
      const missingFieldError = validationError?.errors.find(e => e.field === 'cardRankingAsset');
      expect(missingFieldError).toBeTruthy();

    });
  });

  describe('validateRequiredFieldsInSource - Source Code Validation', () => {
    const testSrcDir = join(process.cwd(), 'src', '__test_validation__');
    const createdSourceFiles: string[] = [];

    beforeAll(() => {
      if (existsSync(testSrcDir)) {
        rmSync(testSrcDir, { recursive: true, force: true });
      }
      mkdirSync(testSrcDir, { recursive: true });
    });

    afterEach(() => {
      for (const filePath of createdSourceFiles) {
        try {
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
          const index = createdSourceFiles.indexOf(filePath);
          if (index > -1) {
            createdSourceFiles.splice(index, 1);
          }
        } catch (error) {
          console.warn(`Failed to clean up source file ${filePath}:`, error);
        }
      }
    });

    afterAll(() => {
      try {
        if (existsSync(testSrcDir)) {
          rmSync(testSrcDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn('Failed to clean up test source directory:', error);
      }
    });

    it('should pass when @required field is initialized in constructor', () => {
      const testFile = join(testSrcDir, 'ValidClass.ts');
      const content = `import { required } from '@ocentra/asset-domain/serialization/decorators';

export class ValidClass {
  @required()
  name!: string;

  constructor() {
    this.name = 'test';
  }
}`;
      writeFileSync(testFile, content, 'utf-8');
      createdSourceFiles.push(testFile);

      const originalExit = process.exit;
      let exitCalled = false;
      process.exit = (() => {
        exitCalled = true;
      }) as typeof process.exit;

      try {
        validateRequiredFieldsInSource();
      } finally {
        process.exit = originalExit;
      }

      expect(exitCalled).toBe(false);
    });

    it('should fail when @required field is not initialized in constructor', () => {
      const testFile = join(testSrcDir, 'InvalidClass.ts');
      const content = `import { required } from '@ocentra/asset-domain/serialization/decorators';

export class InvalidClass {
  @required()
  name!: string;

  constructor() {
  }
}`;
      writeFileSync(testFile, content, 'utf-8');
      createdSourceFiles.push(testFile);

      const originalExit = process.exit;
      const originalError = console.error;
      let exitCalled = false;
      
      process.exit = (() => {
        exitCalled = true;
      }) as typeof process.exit;

      console.error = () => {};

      try {
        validateRequiredFieldsInSource();
      } finally {
        process.exit = originalExit;
        console.error = originalError;
      }

      expect(exitCalled).toBe(true);
    });

    it('should pass when class has no @required fields', () => {
      const testFile = join(testSrcDir, 'NoRequiredClass.ts');
      const content = `export class NoRequiredClass {
        name?: string;

        constructor() {
        }
      }`;
      writeFileSync(testFile, content, 'utf-8');
      createdSourceFiles.push(testFile);

      const originalExit = process.exit;
      let exitCalled = false;
      process.exit = (() => {
        exitCalled = true;
      }) as typeof process.exit;

      try {
        validateRequiredFieldsInSource();
      } finally {
        process.exit = originalExit;
      }

      expect(exitCalled).toBe(false);
    });

    it('should detect multiple @required fields not initialized', () => {
      const testFile = join(testSrcDir, 'MultipleRequiredClass.ts');
      const content = `import { required } from '@ocentra/asset-domain/serialization/decorators';

export class MultipleRequiredClass {
  @required()
  name!: string;

  @required()
  count!: number;

  constructor() {
  }
}`;
      writeFileSync(testFile, content, 'utf-8');
      createdSourceFiles.push(testFile);

      const originalExit = process.exit;
      const originalError = console.error;
      let exitCalled = false;
      
      process.exit = (() => {
        exitCalled = true;
      }) as typeof process.exit;

      console.error = () => {};

      try {
        validateRequiredFieldsInSource();
      } finally {
        process.exit = originalExit;
        console.error = originalError;
      }

      expect(exitCalled).toBe(true);
    });
  });

  describe('plugin integration', () => {
    it('should create plugin with default options', () => {
      const plugin = assetValidationPlugin();
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('asset-validation');
      expect(plugin.enforce).toBe('pre');
    });

    it('should create plugin with custom options', () => {
      const plugin = assetValidationPlugin({
        pattern: 'custom/**/*.asset',
        failOnError: true,
      });
      expect(plugin).toBeDefined();
    });
  });

  describe('Real Production Asset Validation', () => {
    it('should validate real Deck class and catch missing cardRankingAsset field (mimics NormalDeck.asset structure)', async () => {
      const testDeckGuid = 'test-deck-real-0000-0000-000000000000';
      const testDeckAssetPath = join(testAssetsDir, `test-real-deck-missing-cardranking-${testDeckGuid}.asset`);

      const realDeckAssetLikeNormalDeck = {
        system: {
          guid: testDeckGuid,
          assetType: 'Deck',
          schemaVersion: 1,
          displayName: 'Test Real Deck (Missing cardRankingAsset)',
          category: 'Game',
          icon: '🃏',
        },
        data: {
          name: 'TestRealDeck',
          cardTemplates: [
            {
              ref: {
                guid: '048d6ce7-703d-4eb3-9567-773e93eed14f',
                type: 'Card',
                displayName: 'Card',
              },
            },
          ],
          backCardHashes: [],
        },
      };

      writeFileSync(testDeckAssetPath, JSON.stringify(realDeckAssetLikeNormalDeck, null, 2), 'utf-8');
      createdAssets.push(testDeckAssetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      if (!assetTypeMap['Deck']) {
        throw new Error('Deck is not in assetTypeMap! Cannot validate Deck assets. This indicates a problem with the asset registry.');
      }

      const validationError = await validateAssetFile(
        testDeckAssetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      if (!validationError) {
        throw new Error(
          `VALIDATION FAILED: Test Deck asset validation returned NO ERRORS, but it should have caught the missing cardRankingAsset field!\n` +
          `File: ${testDeckAssetPath}\n` +
          `Asset Type: Deck\n` +
          `This is a CRITICAL BUG - validation is not catching missing required fields in real Deck assets!`
        );
      }

      const hasCardRankingError = validationError.errors.some(e => e.field === 'cardRankingAsset');
      
      if (!hasCardRankingError) {
        throw new Error(
          `VALIDATION FAILED: Test Deck asset validation found errors but did NOT catch missing cardRankingAsset field!\n` +
          `Errors found: ${validationError.errors.map(e => `${e.field}: ${e.message}`).join(', ')}\n` +
          `This means validation is broken and not checking for missing required AssetRef fields in real Deck class!`
        );
      }

      expect(validationError).toBeTruthy();
      expect(validationError.assetType).toBe('Deck');
      expect(validationError.errors.length).toBeGreaterThan(0);
      
      const cardRankingError = validationError.errors.find(e => e.field === 'cardRankingAsset');
      expect(cardRankingError).toBeTruthy();
      expect(cardRankingError?.message).toContain('Card Ranking Asset is required');
      expect(cardRankingError?.severity).toBe('error');
    });

    it('should validate real Deck class and catch missing cardRankingAsset in test asset file', async () => {
      const testDeckGuid = 'test-deck-0000-0000-0000-000000000000';
      const invalidDeckAssetPath = join(testAssetsDir, `test-invalid-deck-${testDeckGuid}.asset`);

      const invalidDeckAsset = {
        system: {
          guid: testDeckGuid,
          assetType: 'Deck',
          schemaVersion: 1,
          displayName: 'Test Invalid Deck',
          category: 'Game',
          icon: '🃏',
        },
        data: {
          name: 'TestInvalidDeck',
          cardTemplates: [],
          backCardHashes: [],
        },
      };

      writeFileSync(invalidDeckAssetPath, JSON.stringify(invalidDeckAsset, null, 2), 'utf-8');
      createdAssets.push(invalidDeckAssetPath);

      await import('reflect-metadata');
      const { getSerializableFields } = await import('@ocentra/asset-domain/serialization/decorators');
      const assetTypeMap = await getAssetTypeMapWithTestAsset();
      const fieldTypeMap = await getFieldTypeMapWithTestAsset();

      const validationError = await validateAssetFile(
        invalidDeckAssetPath,
        getSerializableFields,
        assetTypeMap,
        new Map(),
        pluginDir,
        fieldTypeMap,
        await getRequiredFieldsMapWithTestAsset()
      );

      expect(validationError).toBeTruthy();
      expect(validationError?.assetType).toBe('Deck');
      expect(validationError?.errors.length).toBeGreaterThan(0);
      
      const cardRankingError = validationError?.errors.find(e => e.field === 'cardRankingAsset');
      expect(cardRankingError).toBeTruthy();
      expect(cardRankingError?.message).toContain('Card Ranking Asset is required');
      expect(cardRankingError?.severity).toBe('error');
    });
  });
});







