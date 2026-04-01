import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { TestLogDuckDb, getDefaultDbPath } from '@ocentra/logging-domain/test-log/testLogDuckDb'
import type { RunType } from '@ocentra/logging-domain/test-log/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const scriptDir = __dirname
const testRunnerDir = join(scriptDir, '..', '..')
const cloudflareDir = dirname(testRunnerDir) // infra/cloudflare (parent of test-runner)
const testsDir = join(cloudflareDir, 'tests')
const testRunnerReportJsonDir = join(testRunnerDir, 'ReportJson')
const testRunnerReportsDir = join(testRunnerDir, 'reports')
const testRunnerCoverageDir = join(testRunnerDir, 'coverage')
const testRunnerLogsDir = join(testRunnerDir, 'logs')
const reportPath = join(testRunnerReportsDir, 'test-report.html')
const cssPath = join(testRunnerReportsDir, 'test-report.css')
const vitestJsonPath = join(testRunnerReportJsonDir, 'test-results.json')
const currentRunPath = join(testsDir, '.test-storage', 'current-run.json')
const coverageSummaryPath = join(testRunnerCoverageDir, 'coverage-summary.json')
const coverageHtmlPath = join(testRunnerCoverageDir, 'index.html')
const schemathesisJsonPath = join(testRunnerReportJsonDir, 'schemathesis-results.json')
const k6JsonPath = join(testRunnerReportJsonDir, 'k6-results.json')
const mutationJsonPath = join(testRunnerReportJsonDir, 'mutation-results.json')
const semgrepJsonPath = join(testRunnerReportJsonDir, 'semgrep-results.json')
const codeqlJsonPath = join(testRunnerReportJsonDir, 'codeql-results.json')
const trivyJsonPath = join(testRunnerReportJsonDir, 'trivy-results.json')

interface VitestAssertionResult {
  ancestorTitles: string[]
  fullName: string
  status: 'passed' | 'failed' | 'skipped' | 'pending'
  title: string
  duration?: number
  failureMessages: string[]
  meta?: Record<string, unknown>
  stdout?: string[]
  stderr?: string[]
  logs?: Array<{ type: string; content: string }>
}

interface VitestTestFile {
  name: string
  status: 'passed' | 'failed'
  assertionResults: VitestAssertionResult[]
  startTime: number
  endTime: number
}

interface VitestOutput {
  numTotalTestSuites: number
  numPassedTestSuites: number
  numFailedTestSuites: number
  numPendingTestSuites: number
  numTotalTests: number
  numPassedTests: number
  numFailedTests: number
  numPendingTests: number
  numTodoTests: number
  testResults: VitestTestFile[]
  startTime: number
  success: boolean
}

interface ProcessedTest {
  name: string
  status: 'passed' | 'failed' | 'skipped' | 'pending'
  duration?: number
  suite: string
  file: string
  failureMessages: string[]
  stdout?: string[]
  stderr?: string[]
  logs?: Array<{ type: string; content: string }>
}

interface CoverageSummary {
  total: {
    lines: { total: number; covered: number; skipped: number; pct: number }
    statements: { total: number; covered: number; skipped: number; pct: number }
    functions: { total: number; covered: number; skipped: number; pct: number }
    branches: { total: number; covered: number; skipped: number; pct: number }
  }
  [key: string]: {
    lines: { total: number; covered: number; skipped: number; pct: number }
    statements: { total: number; covered: number; skipped: number; pct: number }
    functions: { total: number; covered: number; skipped: number; pct: number }
    branches: { total: number; covered: number; skipped: number; pct: number }
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return String(text).replace(/[&<>"']/g, m => map[m])
}

function escapeJsTemplateLiteral(text: string): string {
  return String(text)
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/`/g, '\\`')     // Escape backticks
    .replace(/\$/g, '\\$')    // Escape dollar signs
    .replace(/\n/g, '\\n')    // Escape newlines
    .replace(/\r/g, '\\r')    // Escape carriage returns
    .replace(/\f/g, '\\f')    // Escape form feeds
    .replace(/\t/g, '\\t')    // Escape tabs
    .replace(/\v/g, '\\v')    // Escape vertical tabs
}

function formatDuration(ms?: number): string {
  if (!ms) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function generateCoverageSection(coverageData?: CoverageSummary, hasCoverageHtml?: boolean): string {
  const coverageIframeSection = hasCoverageHtml
    ? `<div class="coverage-iframe-section">
        <h3>📊 Full Coverage Report (Interactive)</h3>
        <p class="coverage-note">Full navigable coverage report embedded below. You can navigate through files, view line-by-line coverage, and use all features of the Istanbul coverage report.</p>
        <div class="coverage-iframe-container">
          <iframe src="../coverage/index.html" id="coverageIframe" title="Coverage Report" style="width: 100%; height: 800px; border: 1px solid #333; border-radius: 4px;"></iframe>
        </div>
        <p class="coverage-note" style="margin-top: 10px;">
          <a href="../coverage/index.html" target="_blank" style="color: #4ec9b0; text-decoration: underline;">Open coverage report in new tab</a> for full-screen viewing
        </p>
      </div>`
    : ''

  if (!coverageData) {
    const coverageMessage = hasCoverageHtml
      ? `<p class="coverage-note" style="color: #51cf66;">✅ Coverage report available below. Summary data not loaded, but interactive report is accessible.</p>`
      : `<p class="coverage-note" style="color: #ffd93d;">⚠️ Coverage data not available. Run <code>npm run test:coverage</code> to generate coverage report.</p>`
    
    return `<div class="coverage-section">
      <h2>📊 Coverage Summary</h2>
      <div class="coverage-header">
        ${coverageMessage}
      </div>
      ${coverageIframeSection}
    </div>`
  }

  const { total } = coverageData
  const linesMet = total.lines.pct >= 90
  const branchesMet = total.branches.pct >= 80
  const functionsMet = total.functions.pct >= 85
  const statementsMet = total.statements.pct >= 90
  const allMet = linesMet && branchesMet && functionsMet && statementsMet

  const fileEntries = Object.entries(coverageData).filter(([key]) => key !== 'total')
  
  const fileRows = fileEntries.map(([filePath, metrics], index) => {
    const fileLinesMet = metrics.lines.pct >= 90
    const fileBranchesMet = metrics.branches.pct >= 80
    const fileFunctionsMet = metrics.functions.pct >= 85
    const fileStatementsMet = metrics.statements.pct >= 90
    const fileAllMet = fileLinesMet && fileBranchesMet && fileFunctionsMet && fileStatementsMet
    
    const fileStatusClass = fileAllMet ? 'coverage-passed' : 'coverage-failed'
    const fileStatusIcon = fileAllMet ? '✅' : '⚠️'
    
    const fileDetailsId = `coverage-details-${index}`
    const relativePath = filePath.replace(/\\/g, '/').replace(/^.*\/src\//, 'src/')
    
    const fileDetails = `
      <tr class="coverage-details-row" id="${fileDetailsId}">
        <td colspan="6" class="details-cell">
          <div class="details-content">
            <strong>File:</strong> <code>${escapeHtml(relativePath)}</code><br>
            <strong>Full Path:</strong> <code>${escapeHtml(filePath)}</code><br>
            <table class="coverage-metrics-table">
              <tr>
                <th>Metric</th>
                <th>Covered</th>
                <th>Total</th>
                <th>Percentage</th>
                <th>Threshold</th>
                <th>Status</th>
              </tr>
              <tr>
                <td>Lines</td>
                <td>${metrics.lines.covered}</td>
                <td>${metrics.lines.total}</td>
                <td>${metrics.lines.pct.toFixed(1)}%</td>
                <td>90%</td>
                <td class="${fileLinesMet ? 'status-pass' : 'status-fail'}">${fileLinesMet ? '✅' : '❌'}</td>
              </tr>
              <tr>
                <td>Branches</td>
                <td>${metrics.branches.covered}</td>
                <td>${metrics.branches.total}</td>
                <td>${metrics.branches.pct.toFixed(1)}%</td>
                <td>80%</td>
                <td class="${fileBranchesMet ? 'status-pass' : 'status-fail'}">${fileBranchesMet ? '✅' : '❌'}</td>
              </tr>
              <tr>
                <td>Functions</td>
                <td>${metrics.functions.covered}</td>
                <td>${metrics.functions.total}</td>
                <td>${metrics.functions.pct.toFixed(1)}%</td>
                <td>85%</td>
                <td class="${fileFunctionsMet ? 'status-pass' : 'status-fail'}">${fileFunctionsMet ? '✅' : '❌'}</td>
              </tr>
              <tr>
                <td>Statements</td>
                <td>${metrics.statements.covered}</td>
                <td>${metrics.statements.total}</td>
                <td>${metrics.statements.pct.toFixed(1)}%</td>
                <td>90%</td>
                <td class="${fileStatementsMet ? 'status-pass' : 'status-fail'}">${fileStatementsMet ? '✅' : '❌'}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>`
    
    return `<tr class="coverage-file-row ${fileStatusClass}" data-coverage-id="${index}">
      <td class="expand-icon" id="coverage-icon-${index}" onclick="toggleCoverageDetails(${index})">▶</td>
      <td class="row-number">${index + 1}</td>
      <td class="coverage-file-name" onclick="toggleCoverageDetails(${index})" title="${escapeHtml(relativePath)}">${escapeHtml(relativePath)}</td>
      <td class="coverage-metric" onclick="toggleCoverageDetails(${index})">${metrics.lines.pct.toFixed(1)}%</td>
      <td class="coverage-metric" onclick="toggleCoverageDetails(${index})">${metrics.branches.pct.toFixed(1)}%</td>
      <td class="coverage-status" onclick="toggleCoverageDetails(${index})">${fileStatusIcon}</td>
    </tr>${fileDetails}`
  }).join('\n')

  const overallStatus = allMet ? '✅ All Thresholds Met' : '⚠️ Some Thresholds Not Met'
  const overallStatusClass = allMet ? 'coverage-overall-pass' : 'coverage-overall-fail'

  return `<div class="coverage-section">
    <h2>📊 Coverage Summary</h2>
    <div class="coverage-header">
      <p><strong>Overall Status:</strong> <span class="${overallStatusClass}">${overallStatus}</span></p>
      <p><strong>Total Files:</strong> ${fileEntries.length} files analyzed</p>
      <p><strong>Thresholds:</strong> Lines ≥90% | Branches ≥80% | Functions ≥85% | Statements ≥90%</p>
    </div>
    
    <div class="coverage-overall-metrics">
      <table class="coverage-summary-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Covered</th>
            <th>Total</th>
            <th>Percentage</th>
            <th>Threshold</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr class="${linesMet ? 'coverage-passed' : 'coverage-failed'}">
            <td><strong>Lines</strong></td>
            <td>${total.lines.covered}</td>
            <td>${total.lines.total}</td>
            <td><strong>${total.lines.pct.toFixed(1)}%</strong></td>
            <td>90%</td>
            <td class="${linesMet ? 'status-pass' : 'status-fail'}">${linesMet ? '✅' : '❌'}</td>
          </tr>
          <tr class="${branchesMet ? 'coverage-passed' : 'coverage-failed'}">
            <td><strong>Branches</strong></td>
            <td>${total.branches.covered}</td>
            <td>${total.branches.total}</td>
            <td><strong>${total.branches.pct.toFixed(1)}%</strong></td>
            <td>80%</td>
            <td class="${branchesMet ? 'status-pass' : 'status-fail'}">${branchesMet ? '✅' : '❌'}</td>
          </tr>
          <tr class="${functionsMet ? 'coverage-passed' : 'coverage-failed'}">
            <td><strong>Functions</strong></td>
            <td>${total.functions.covered}</td>
            <td>${total.functions.total}</td>
            <td><strong>${total.functions.pct.toFixed(1)}%</strong></td>
            <td>85%</td>
            <td class="${functionsMet ? 'status-pass' : 'status-fail'}">${functionsMet ? '✅' : '❌'}</td>
          </tr>
          <tr class="${statementsMet ? 'coverage-passed' : 'coverage-failed'}">
            <td><strong>Statements</strong></td>
            <td>${total.statements.covered}</td>
            <td>${total.statements.total}</td>
            <td><strong>${total.statements.pct.toFixed(1)}%</strong></td>
            <td>90%</td>
            <td class="${statementsMet ? 'status-pass' : 'status-fail'}">${statementsMet ? '✅' : '❌'}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <h3>File-by-File Coverage (Click rows to expand details)</h3>
    <div class="table-controls">
      <button onclick="expandAllCoverage()" class="control-btn">Expand All</button>
      <button onclick="expandFailedCoverageOnly()" class="control-btn">Expand Failed Only</button>
      <button onclick="collapseAllCoverage()" class="control-btn">Collapse All</button>
      <button onclick="showFailedCoverageOnly()" class="control-btn">Show Failed Only</button>
      <button onclick="showAllCoverage()" class="control-btn">Show All</button>
      <input type="text" id="coverageSearchInput" placeholder="Search files..." class="search-input" onkeyup="filterCoverage()">
    </div>
    <table id="coverageTable" class="test-table">
      <thead>
        <tr>
          <th class="th-expand"></th>
          <th class="th-number">#</th>
          <th>File Path</th>
          <th>Lines</th>
          <th>Branches</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${fileRows}
      </tbody>
    </table>
    ${coverageIframeSection}
  </div>`
}

interface ParsedFinding {
  ruleId: string
  level: string
  message: string
  file: string
  line: number
}

interface SecurityTestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped' | 'warning'
  exitCode?: number
  errorType?: 'not_installed' | 'encoding_error' | 'threshold_violation' | 'execution_error'
  duration?: number
  output?: string
  errorMessage?: string
  summary?: string
  findings?: number
  vulnerabilities?: number
  sarifPath?: string
  resultsPath?: string
  installCommand?: string
  workaround?: string
  testCases?: number
  failures?: number
  errors?: number
  errorCategories?: Record<string, number>
  errorMessages?: string[]
  thresholdFailures?: string[]
  parsedFindings?: ParsedFinding[]
  metrics?: {
    requests?: number
    errors?: number
    errorRate?: number
    avgResponseTime?: number
    p95ResponseTime?: number
    p90ResponseTime?: number
    maxResponseTime?: number
    throughput?: number
    vus?: { max?: number; avg?: number }
    thresholds?: Array<{ name: string; passed: boolean; value?: string; actualValue?: string; thresholdValue?: string }>
    checkFailures?: Array<{ name: string; passes: number; fails: number; failureRate: number }>
  }
  targets?: Array<{ symbol: string; kind: string; file: string; reason?: string } | { target: string; type: string; class?: string; packages?: number }>
  dbMetadata?: { updatedAt?: string; nextUpdate?: string; version?: number }
}

function generateSecurityTestRow(test: SecurityTestResult | undefined, index: number, testType: 'schemathesis' | 'k6' | 'mutation'): string {
  if (!test) {
    return `<tr class="security-test-row skipped-row" data-security-id="${testType}-${index}">
      <td class="row-number">${index + 1}</td>
      <td class="test-name">${testType === 'schemathesis' ? '🔍 Schemathesis API Fuzzing' : testType === 'k6' ? '⚡ k6 Concurrency/Load Tests' : '🧬 Stryker Mutation Testing'}</td>
      <td class="status-cell">⏭️ SKIPPED</td>
      <td>-</td>
      <td class="error-preview">Not run or not available</td>
      <td class="copy-cell"></td>
      <td class="rerun-cell"><button class="rerun-btn" onclick="rerunSecurityTest('${testType}')" title="Re-run this test">🔄</button></td>
    </tr>`
  }
  
  const statusIcon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : test.status === 'warning' ? '⚠️' : '⏭️'
  const statusClass = test.status === 'failed' ? 'failed-row' : test.status === 'passed' ? 'passed-row' : test.status === 'warning' ? 'warning-row' : 'skipped-row'
  const statusText = test.status === 'warning' ? 'WARNING' : test.status.toUpperCase()
  const duration = test.duration ? formatDuration(test.duration * 1000) : '-'
  const errorPreview = test.errorMessage ? escapeHtml(test.errorMessage.substring(0, 80)) : (test.summary ? escapeHtml(test.summary.substring(0, 80)) : '-')
  const detailsId = `security-details-${testType}-${index}`
  
  const copyData = JSON.stringify({
    test: test.name,
    type: testType,
    status: test.status,
    exitCode: test.exitCode,
    errorType: test.errorType,
    duration: test.duration,
    errorMessage: test.errorMessage,
    summary: test.summary,
    metrics: test.metrics,
    error: test.output,
  }, null, 2)
  
  const detailsContent = generateSecurityTestDetails(test, testType)
  
  return `<tr class="security-test-row ${statusClass}" data-security-id="${testType}-${index}" data-original-number="${index + 1}">
    <td class="expand-icon" id="security-icon-${testType}-${index}" onclick="toggleSecurityDetails('${testType}', ${index})">▶</td>
    <td class="row-number">${index + 1}</td>
    <td class="test-name" title="${escapeHtml(test.name)}" onclick="toggleSecurityDetails('${testType}', ${index})">${escapeHtml(test.name)}</td>
    <td class="status-cell" onclick="toggleSecurityDetails('${testType}', ${index})">${statusIcon} ${statusText}</td>
    <td onclick="toggleSecurityDetails('${testType}', ${index})">${duration}</td>
    <td class="error-preview" title="${errorPreview !== '-' ? escapeHtml(errorPreview) : ''}" onclick="toggleSecurityDetails('${testType}', ${index})">${errorPreview}</td>
    <td class="copy-cell" onclick="event.stopPropagation(); copySecurityDetails('${testType}', ${index}, \`${escapeJsTemplateLiteral(copyData)}\`)">
      <span class="copy-icon" title="Copy test details">📋</span>
    </td>
    <td class="rerun-cell">
      <button class="rerun-btn" onclick="event.stopPropagation(); rerunSecurityTest('${testType}')" title="Re-run this test">🔄</button>
    </td>
  </tr>
  <tr class="security-details-row" id="${detailsId}">
    <td colspan="8" class="details-cell">
      <div class="details-content">${detailsContent}</div>
    </td>
  </tr>`
}

function generateSecurityTestDetails(test: SecurityTestResult, testType: string): string {
  let details = `<div style="margin-bottom: 20px;">`
  details += `<strong>Test Type:</strong> ${escapeHtml(testType)}<br>`
  details += `<strong>Status:</strong> <span style="color: ${test.status === 'passed' ? '#51cf66' : test.status === 'failed' ? '#ff6b6b' : '#ffd93d'}; font-weight: bold;">${test.status.toUpperCase()}</span><br>`
  if (test.exitCode !== undefined) details += `<strong>Exit Code:</strong> ${test.exitCode}<br>`
  if (test.errorType) {
    const errorTypeColors: Record<string, string> = {
      'not_installed': '#ff6b6b',
      'encoding_error': '#ffd93d',
      'threshold_violation': '#ffd93d',
      'execution_error': '#ff6b6b'
    }
    details += `<strong>Error Type:</strong> <span style="color: ${errorTypeColors[test.errorType] || '#ff6b6b'};">${escapeHtml(test.errorType.replace(/_/g, ' ').toUpperCase())}</span><br>`
  }
  if (test.duration) details += `<strong>Duration:</strong> ${formatDuration(test.duration * 1000)}<br>`
  details += `</div>`
  
  if (test.status === 'failed' || test.status === 'warning') {
    details += `<div style="background: ${test.status === 'failed' ? '#2d1b1b' : '#2d2b1b'}; border-left: 4px solid ${test.status === 'failed' ? '#ff6b6b' : '#ffd93d'}; padding: 15px; margin: 15px 0; border-radius: 4px;">`
    details += `<h4 style="margin-top: 0; color: ${test.status === 'failed' ? '#ff6b6b' : '#ffd93d'};">${test.status === 'failed' ? '❌ Failure Reason' : '⚠️ Warning Reason'}:</h4>`
    
    if (test.errorType === 'not_installed') {
      details += `<p style="color: #ff6b6b; font-weight: bold;">Tool is not installed or not found in PATH.</p>`
      if (test.installCommand) {
        details += `<p><strong>Installation Command:</strong> <code style="background: #1e1e1e; padding: 5px 10px; border-radius: 3px;">${escapeHtml(test.installCommand)}</code></p>`
      }
    } else if (test.errorType === 'encoding_error') {
      details += `<p style="color: #ffd93d; font-weight: bold;">Windows console encoding issue - tool ran but output encoding failed.</p>`
      if (test.workaround) {
        details += `<p><strong>Workaround:</strong> ${escapeHtml(test.workaround)}</p>`
      }
    } else if (test.errorType === 'threshold_violation') {
      details += `<p style="color: #ffd93d; font-weight: bold;">Performance thresholds were not met (test ran successfully).</p>`
      
      if (test.metrics?.checkFailures && test.metrics.checkFailures.length > 0) {
        details += `<h4 style="margin-top: 15px; color: #ff6b6b;">Failed Checks (Root Cause):</h4>`
        details += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: #252526; border: 1px solid #3e3e42;">`
        details += `<thead><tr style="background: #2d2d2d;"><th style="padding: 8px; border: 1px solid #3e3e42; text-align: left;">Check Name</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: center;">Passed</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: center;">Failed</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: center;">Failure Rate</th></tr></thead><tbody>`
        test.metrics.checkFailures.forEach(check => {
          details += `<tr><td style="padding: 8px; border: 1px solid #3e3e42; color: #ce9178;"><code>${escapeHtml(check.name)}</code></td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; color: #51cf66;">${check.passes}</td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; color: #ff6b6b; font-weight: bold;">${check.fails}</td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; color: #ff6b6b; font-weight: bold;">${check.failureRate.toFixed(1)}%</td></tr>`
        })
        details += `</tbody></table>`
        details += `<p style="color: #808080; margin-top: 10px; font-size: 12px;">💡 <strong>Why this matters:</strong> Failed checks cause the error rate to increase, which violates thresholds. Fix the failing checks to resolve threshold violations.</p>`
      }
      
      if (test.thresholdFailures && test.thresholdFailures.length > 0) {
        details += `<h4 style="margin-top: 15px; color: #ff6b6b;">Failed Thresholds:</h4>`
        details += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: #252526; border: 1px solid #3e3e42;">`
        details += `<thead><tr style="background: #2d2d2d;"><th style="padding: 8px; border: 1px solid #3e3e42; text-align: left;">Threshold</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: center;">Required</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: center;">Actual</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: center;">Status</th></tr></thead><tbody>`
        test.thresholdFailures.forEach(thresholdName => {
          const threshold = test.metrics?.thresholds?.find(t => t.name === thresholdName)
          const actualValue = threshold?.actualValue || 'N/A'
          const thresholdValue = threshold?.thresholdValue || 'N/A'
          details += `<tr><td style="padding: 8px; border: 1px solid #3e3e42; color: #ce9178;"><code>${escapeHtml(thresholdName)}</code></td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; color: #9cdcfe;">${escapeHtml(thresholdValue)}</td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; color: #ff6b6b; font-weight: bold;">${escapeHtml(actualValue)}</td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; color: #ff6b6b;">❌ FAIL</td></tr>`
        })
        details += `</tbody></table>`
        
        if (testType === 'k6') {
          const errorThreshold = test.thresholdFailures.find(t => t.includes('errors:'))
          if (errorThreshold && test.metrics?.errorRate !== undefined) {
            details += `<p style="color: #ffd93d; margin-top: 10px; font-size: 13px;">⚠️ <strong>Error Rate Analysis:</strong> Error rate is ${(test.metrics.errorRate * 100).toFixed(1)}% (threshold: &lt;10%). This is caused by failed checks above.</p>`
            details += `<p style="color: #808080; font-size: 12px; margin-top: 5px;">💡 <strong>Fix:</strong> Check the "Failed Checks" table above to see which checks are failing. Common causes:</p>`
            details += `<ul style="color: #808080; font-size: 12px; margin-left: 20px;">`
            details += `<li>API returning unexpected status codes (not 200, 401, or 429)</li>`
            details += `<li>Response format doesn't match expected schema</li>`
            details += `<li>Business logic checks failing (balance calculations, etc.)</li>`
            details += `</ul>`
          }
        }
      }
      if (testType === 'k6' && test.metrics) {
        details += `<div style="margin-top: 15px; padding: 10px; background: #2d2b1b; border-left: 3px solid #ffd93d; border-radius: 4px;">`
        details += `<p style="margin: 0; color: #ffd93d; font-weight: bold;">k6 Load Test Metrics:</p>`
        if (test.metrics.requests !== undefined) {
          details += `<p style="margin: 5px 0; color: #9cdcfe;">Total Requests: ${test.metrics.requests.toLocaleString()}</p>`
        }
        if (test.metrics.errorRate !== undefined) {
          const errorRatePercent = (test.metrics.errorRate * 100).toFixed(2)
          details += `<p style="margin: 5px 0; color: ${test.metrics.errorRate > 0.1 ? '#ff6b6b' : '#51cf66'};">
            Error Rate: ${errorRatePercent}% (Threshold: <10%)
          </p>`
        }
        if (test.metrics.avgResponseTime !== undefined) {
          details += `<p style="margin: 5px 0; color: #9cdcfe;">Avg Response Time: ${test.metrics.avgResponseTime.toFixed(2)}ms</p>`
        }
        details += `</div>`
      }
    } else if (test.errorType === 'execution_error') {
      details += `<p style="color: #ff6b6b; font-weight: bold;">Tool execution failed.</p>`
    }
    
    if (test.errorMessage) {
      details += `<h5 style="margin-top: 15px; color: ${test.status === 'failed' ? '#ff6b6b' : '#ffd93d'};">Error Details:</h5>`
      details += `<pre style="background: #1e1e1e; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 10px 0;"><code>${escapeHtml(test.errorMessage)}</code></pre>`
    }
    
    if (test.summary && !test.errorMessage?.includes(test.summary)) {
      details += `<p style="margin-top: 10px;"><strong>Summary:</strong> ${escapeHtml(test.summary)}</p>`
    }
    
    details += `</div>`
  } else if (test.status === 'passed') {
    details += `<div style="background: #1b2d1b; border-left: 4px solid #51cf66; padding: 15px; margin: 15px 0; border-radius: 4px;">`
    details += `<h4 style="margin-top: 0; color: #51cf66;">✅ Test Passed Successfully</h4>`
    if (test.summary) {
      details += `<p>${escapeHtml(test.summary)}</p>`
    }
    if (testType === 'trivy' && test.vulnerabilities !== undefined) {
      const totalPackages = test.targets?.reduce((sum, t) => sum + ('packages' in t ? (t.packages || 0) : 0), 0) || 0
      details += `<h4 style="margin-top: 15px; color: #9cdcfe;">Scan Details:</h4>`
      details += `<p style="margin-top: 10px; color: #9cdcfe;"><strong>Scan Type:</strong> Filesystem scan (dependencies, packages, and libraries)</p>`
      details += `<p style="color: #9cdcfe;"><strong>Targets Scanned:</strong> ${test.targets?.length || 0}</p>`
      if (totalPackages > 0) {
        details += `<p style="color: #9cdcfe;"><strong>Total Packages:</strong> ${totalPackages.toLocaleString()}</p>`
      }
      
      if (test.targets && test.targets.length > 0) {
        details += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: #252526; border: 1px solid #3e3e42;">`
        details += `<thead><tr style="background: #2d2d2d;"><th style="padding: 8px; border: 1px solid #3e3e42; text-align: left;">Target</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: left;">Type</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: center;">Packages</th></tr></thead><tbody>`
        test.targets.forEach(target => {
          // Check if this is a Trivy target (has 'target' property) vs CodeQL target (has 'file' property)
          if ('target' in target) {
            // Trivy target - make path relative to cloudflareDir
            let displayTarget = target.target
            if (displayTarget.startsWith(cloudflareDir)) {
              displayTarget = displayTarget.replace(cloudflareDir, '.').replace(/^\./, '')
            }
            displayTarget = displayTarget.replace(/\\/g, '/').replace(/^\/+/, '')
            if (!displayTarget || displayTarget === target.target) {
              // Fallback: show last 3 path segments
              displayTarget = target.target.split(/[/\\]/).slice(-3).join('/')
            }
            details += `<tr><td style="padding: 8px; border: 1px solid #3e3e42; color: #ce9178;"><code>${escapeHtml(displayTarget)}</code></td><td style="padding: 8px; border: 1px solid #3e3e42; color: #9cdcfe;">${escapeHtml(target.type || 'filesystem')}</td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; color: #51cf66;">${target.packages?.toLocaleString() || '0'}</td></tr>`
          } else {
            // CodeQL target - use existing logic
            details += `<tr><td style="padding: 8px; border: 1px solid #3e3e42; color: #ce9178;"><code>${escapeHtml(target.file)}</code></td><td style="padding: 8px; border: 1px solid #3e3e42; color: #9cdcfe;">${escapeHtml(target.kind)}</td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; color: #9cdcfe;">-</td></tr>`
          }
        })
        details += `</tbody></table>`
      }
      
      details += `<p style="margin-top: 15px; color: ${test.vulnerabilities === 0 ? '#51cf66' : '#ff6b6b'}; font-weight: bold;"><strong>Vulnerabilities Found:</strong> ${test.vulnerabilities} CRITICAL/HIGH severity</p>`
      if (test.vulnerabilities === 0) {
        details += `<p style="color: #51cf66; font-size: 13px;">✅ No critical or high severity vulnerabilities detected.</p>`
      }
      
      if (test.dbMetadata) {
        details += `<h4 style="margin-top: 15px; color: #9cdcfe;">Database Information:</h4>`
        if (test.dbMetadata.updatedAt) {
          const updatedDate = new Date(test.dbMetadata.updatedAt)
          const ageHours = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60))
          const ageDays = Math.floor(ageHours / 24)
          const ageText = ageDays > 0 ? `${ageDays} day${ageDays > 1 ? 's' : ''}` : `${ageHours} hour${ageHours !== 1 ? 's' : ''}`
          details += `<p style="color: #9cdcfe;"><strong>Last Updated:</strong> ${escapeHtml(test.dbMetadata.updatedAt)} (${ageText} ago)</p>`
          if (ageHours > 24) {
            details += `<p style="color: #ffd93d; font-size: 12px; margin-top: 5px;">⚠️ Database is ${ageText} old. Consider updating with: <code>trivy image --download-db-only</code></p>`
          }
        }
        if (test.dbMetadata.nextUpdate) {
          details += `<p style="color: #9cdcfe;"><strong>Next Update:</strong> ${escapeHtml(test.dbMetadata.nextUpdate)}</p>`
        }
        if (test.dbMetadata.version !== undefined) {
          details += `<p style="color: #9cdcfe;"><strong>Database Version:</strong> ${test.dbMetadata.version}</p>`
        }
      }
      
      details += `<h4 style="margin-top: 15px; color: #9cdcfe;">Database Download & Update Information:</h4>`
      details += `<div style="background: #2d2b1b; border-left: 3px solid #9cdcfe; border-radius: 4px; padding: 10px; margin-top: 10px;">`
      details += `<p style="margin: 0; color: #51cf66; font-size: 13px; font-weight: bold;">✅ Docker is NOT Required for Trivy</p>`
      details += `<p style="margin: 5px 0 0 0; color: #9cdcfe; font-size: 12px;">Trivy has its <strong>own built-in OCI client</strong> and can download databases without Docker:</p>`
      details += `<ul style="margin: 5px 0 0 20px; color: #9cdcfe; font-size: 12px;">`
      details += `<li>Databases are <strong>OCI artifacts</strong> (not Docker images) - stored in container registries</li>`
      details += `<li>We use <strong>public registries</strong> (AWS ECR Public, GCR Mirror) that require no authentication</li>`
      details += `<li>Trivy's built-in OCI client downloads directly from registries (like a web browser downloads files)</li>`
      details += `<li>Docker credential helpers are <strong>optional</strong> - only needed for private/authenticated registries</li>`
      details += `<li>Since we use public registries, Docker Desktop is <strong>completely optional</strong> (not required)</li>`
      details += `</ul>`
      details += `<p style="margin: 10px 0 0 0; color: #9cdcfe; font-size: 13px;"><strong>📥 Manual Database Update (No Docker Needed):</strong></p>`
      details += `<ul style="margin: 5px 0 0 20px; color: #9cdcfe; font-size: 12px;">`
      details += `<li><strong>Method 1 - Using Trivy (recommended, no Docker):</strong></li>`
      details += `<li style="list-style: none; margin-left: 20px; color: #ce9178;"><code>trivy image --download-db-only</code></li>`
      details += `<li><strong>Method 2 - Using ORAS CLI (alternative, no Docker):</strong></li>`
      details += `<li style="list-style: none; margin-left: 20px; color: #ce9178;"><code>oras pull public.ecr.aws/aquasecurity/trivy-db:2</code></li>`
      details += `<li style="list-style: none; margin-left: 20px; color: #808080; font-size: 11px;">Then extract db.tar.gz and place metadata.json + trivy.db in Trivy cache directory</li>`
      details += `<li><strong>Current configuration:</strong> AWS ECR Public → GCR Mirror → GHCR (automatic fallback)</li>`
      details += `<li><strong>Update frequency:</strong> Databases published every 6 hours (vuln DB) and 24 hours (Java DB)</li>`
      details += `<li>Trivy automatically checks for updates during scans (no manual action needed)</li>`
      details += `</ul>`
      details += `<p style="margin: 10px 0 0 0; color: #808080; font-size: 12px; font-style: italic;">💡 <strong>Why Docker is mentioned:</strong> Trivy can optionally use Docker's credential helper system if it exists (for accessing private registries). Since we use public registries that don't require authentication, Docker is completely optional and not needed.</p>`
      details += `</div>`
      
      if (test.errorMessage && !test.errorMessage.includes('Docker credential helper')) {
        details += `<p style="margin-top: 10px; color: #ffd93d;"><strong>⚠️ Note:</strong> ${escapeHtml(test.errorMessage)}</p>`
      }
    } else if (testType === 'semgrep' && test.findings !== undefined) {
      details += `<p style="margin-top: 10px; color: #51cf66;"><strong>Scanned:</strong> Source code files</p>`
      details += `<p style="color: #51cf66;"><strong>Security Findings:</strong> ${test.findings} (no issues detected)</p>`
    } else if (testType === 'codeql' && test.findings !== undefined) {
      details += `<p style="margin-top: 10px; color: #51cf66;"><strong>Scanned:</strong> Source code with CodeQL queries</p>`
      details += `<p style="color: #51cf66;"><strong>Security Findings:</strong> ${test.findings} (no critical issues detected)</p>`
    }
    details += `</div>`
  } else if (test.summary) {
    details += `<h4 style="margin-top: 15px;">Summary:</h4><p>${escapeHtml(test.summary)}</p>`
  }
  
  if (test.installCommand && test.errorType !== 'not_installed') {
    details += `<h4 style="margin-top: 15px; color: #ffd93d;">Installation Command:</h4><p><code>${escapeHtml(test.installCommand)}</code></p>`
  }
  
  if (test.workaround && test.errorType !== 'encoding_error') {
    details += `<h4 style="margin-top: 15px; color: #ffd93d;">Workaround:</h4><p>${escapeHtml(test.workaround)}</p>`
  }
  
  if (test.metrics) {
    details += generateMetricsTable(test.metrics)
  }
  
  if (test.thresholdFailures && test.thresholdFailures.length > 0 && test.errorType !== 'threshold_violation') {
    details += `<h4 style="margin-top: 15px; color: #ff6b6b;">Failed Thresholds:</h4><ul>`
    test.thresholdFailures.forEach(t => details += `<li><code>${escapeHtml(t)}</code></li>`)
    details += `</ul>`
  }
  
  if (test.testCases !== undefined || test.failures !== undefined) {
    details += `<h4 style="margin-top: 15px;">Test Results:</h4>`
    if (test.testCases !== undefined) details += `<p>Test Cases: ${test.testCases}</p>`
    if (test.failures !== undefined) {
      details += `<p style="color: ${test.failures > 0 ? '#ff6b6b' : '#51cf66'}; font-weight: bold;">Failures: ${test.failures}</p>`
      if (testType === 'schemathesis' && test.failures > 0) {
        details += `<p style="color: #ffd93d; margin-top: 10px; font-size: 13px;">⚠️ Schemathesis found API contract violations. These are <strong>real API issues</strong> that need to be fixed:</p>`
        
        if (test.errorCategories && Object.keys(test.errorCategories).length > 0) {
          details += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: #252526; border: 1px solid #3e3e42;">`
          details += `<thead><tr style="background: #2d2d2d;"><th style="padding: 8px; border: 1px solid #3e3e42; text-align: left;">Issue Category</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: center;">Count</th><th style="padding: 8px; border: 1px solid #3e3e42; text-align: left;">Severity</th></tr></thead><tbody>`
          
          const categoryLabels: Record<string, { label: string; severity: string; color: string }> = {
            'missing_auth': { label: 'Missing Authentication', severity: '🔴 CRITICAL', color: '#ff6b6b' },
            'server_error': { label: 'Server Errors (500)', severity: '🔴 CRITICAL', color: '#ff6b6b' },
            'unsupported_method': { label: 'Unsupported Methods (TRACE)', severity: '🟡 HIGH', color: '#ffd93d' },
            'undocumented_status': { label: 'Undocumented Status Codes', severity: '🟡 HIGH', color: '#ffd93d' },
            'invalid_data_accepted': { label: 'Invalid Data Accepted', severity: '🟡 HIGH', color: '#ffd93d' },
            'valid_data_rejected': { label: 'Valid Data Rejected', severity: '🟠 MEDIUM', color: '#ffa94d' },
            'missing_header': { label: 'Missing Header Not Rejected', severity: '🟠 MEDIUM', color: '#ffa94d' },
            'schema_violation': { label: 'Response Schema Violation', severity: '🟠 MEDIUM', color: '#ffa94d' },
            'undocumented_content_type': { label: 'Undocumented Content-Type', severity: '🟢 LOW', color: '#51cf66' },
          };
          
          const sortedCategories = Object.entries(test.errorCategories)
            .sort((a, b) => {
              const aInfo = categoryLabels[a[0]] || { severity: '🟢 LOW' };
              const bInfo = categoryLabels[b[0]] || { severity: '🟢 LOW' };
              const severityOrder: Record<string, number> = { '🔴 CRITICAL': 0, '🟡 HIGH': 1, '🟠 MEDIUM': 2, '🟢 LOW': 3 };
              const aOrder = severityOrder[aInfo.severity] ?? 999;
              const bOrder = severityOrder[bInfo.severity] ?? 999;
              if (aOrder !== bOrder) return aOrder - bOrder;
              return b[1] - a[1];
            });
          
          sortedCategories.forEach(([key, count]) => {
            const info = categoryLabels[key] || { label: key, severity: '🟢 LOW', color: '#808080' };
            details += `<tr><td style="padding: 8px; border: 1px solid #3e3e42; color: ${info.color};">${info.label}</td><td style="padding: 8px; border: 1px solid #3e3e42; text-align: center; font-weight: bold;">${count}</td><td style="padding: 8px; border: 1px solid #3e3e42; color: ${info.color};">${info.severity}</td></tr>`
          });
          
          details += `</tbody></table>`
        }
        
        details += `<p style="color: #808080; margin-top: 15px; font-size: 12px;">💡 <strong>What this means:</strong> These failures indicate real API security and contract issues that should be fixed in the API implementation, not in the tests.</p>`
      }
    }
  }
  
  if (test.errorMessages && test.errorMessages.length > 0) {
    details += `<h4 style="margin-top: 15px; color: #ff6b6b;">Error Messages:</h4>`
    if (test.errorMessages.length > 10) {
      details += `<p style="color: #ff6b6b; font-weight: bold;">${test.errorMessages.length} errors found (showing first 10):</p>`
      details += `<ul style="max-height: 300px; overflow-y: auto;">`
      test.errorMessages.slice(0, 10).forEach(e => details += `<li style="margin: 5px 0;"><code style="font-size: 11px;">${escapeHtml(e)}</code></li>`)
      details += `</ul>`
      details += `<p style="color: #808080; font-size: 12px; margin-top: 10px;">... and ${test.errorMessages.length - 10} more errors (see full output below)</p>`
    } else {
      details += `<ul>`
      test.errorMessages.forEach(e => details += `<li style="margin: 5px 0;"><code style="font-size: 11px;">${escapeHtml(e)}</code></li>`)
      details += `</ul>`
    }
  }
  
  if (test.errors !== undefined && test.errors > 0) {
    details += `<p style="color: #ff6b6b; margin-top: 10px;"><strong>Total Errors:</strong> ${test.errors}</p>`
  }
  
  if (test.output && test.output.length > 0) {
    details += `<h4 style="margin-top: 15px;">Full Output:</h4>`
    details += `<details><summary style="cursor: pointer; color: #9cdcfe; font-weight: bold; margin-bottom: 10px;">📄 View Full Output (${(test.output.length / 1024).toFixed(1)} KB)</summary>`
    details += `<div class="security-test-output" style="max-height: 500px; overflow-y: auto; margin-top: 10px; background: #1e1e1e; padding: 15px; border-radius: 4px;">`
    details += `<pre style="white-space: pre-wrap; word-break: break-all; margin: 0;"><code>${escapeHtml(test.output)}</code></pre></div></details>`
  }
  
  return details
}

function generateMetricsTable(metrics: SecurityTestResult['metrics']): string {
  if (!metrics) return ''
  let table = `<h4 style="margin-top: 15px;">Performance Metrics:</h4>`
  table += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">`
  table += `<thead><tr style="background: #2d2d2d;"><th style="padding: 8px; border: 1px solid #333; text-align: left;">Metric</th><th style="padding: 8px; border: 1px solid #333; text-align: left;">Value</th></tr></thead><tbody>`
  if (metrics.requests !== undefined) table += `<tr><td style="padding: 8px; border: 1px solid #333; color: #9cdcfe;"><strong>Total Requests</strong></td><td style="padding: 8px; border: 1px solid #333;">${metrics.requests.toLocaleString()}</td></tr>`
  if (metrics.errorRate !== undefined) {
    const rate = (metrics.errorRate * 100).toFixed(2)
    table += `<tr><td style="padding: 8px; border: 1px solid #333; color: #9cdcfe;"><strong>Error Rate</strong></td><td style="padding: 8px; border: 1px solid #333; color: ${metrics.errorRate > 0.1 ? '#ff6b6b' : '#51cf66'};">${rate}%</td></tr>`
  }
  if (metrics.avgResponseTime !== undefined) table += `<tr><td style="padding: 8px; border: 1px solid #333; color: #9cdcfe;"><strong>Avg Response Time</strong></td><td style="padding: 8px; border: 1px solid #333;">${metrics.avgResponseTime.toFixed(2)}ms</td></tr>`
  if (metrics.p95ResponseTime !== undefined) table += `<tr><td style="padding: 8px; border: 1px solid #333; color: #9cdcfe;"><strong>p95 Response Time</strong></td><td style="padding: 8px; border: 1px solid #333; color: ${metrics.p95ResponseTime > 2000 ? '#ff6b6b' : '#51cf66'};">${metrics.p95ResponseTime.toFixed(2)}ms</td></tr>`
  if (metrics.throughput !== undefined) table += `<tr><td style="padding: 8px; border: 1px solid #333; color: #9cdcfe;"><strong>Throughput</strong></td><td style="padding: 8px; border: 1px solid #333;">${metrics.throughput.toFixed(1)} req/s</td></tr>`
  if (metrics.vus?.max !== undefined) table += `<tr><td style="padding: 8px; border: 1px solid #333; color: #9cdcfe;"><strong>Max VUs</strong></td><td style="padding: 8px; border: 1px solid #333;">${metrics.vus.max}</td></tr>`
  if (metrics.thresholds && metrics.thresholds.length > 0) {
    table += `<tr><td colspan="2" style="padding: 8px; border: 1px solid #333;"><strong style="color: #9cdcfe;">Thresholds:</strong></td></tr>`
    metrics.thresholds.forEach(t => {
      table += `<tr><td style="padding: 8px; border: 1px solid #333; padding-left: 20px;"><code>${escapeHtml(t.name)}</code></td>`
      table += `<td style="padding: 8px; border: 1px solid #333; color: ${t.passed ? '#51cf66' : '#ff6b6b'};">${t.passed ? '✅ PASS' : '❌ FAIL'}${t.value ? ` (${escapeHtml(t.value)})` : ''}</td></tr>`
    })
  }
  table += `</tbody></table>`
  return table
}

function generateSecurityTestsSection(schemathesisResult?: SecurityTestResult, k6Result?: SecurityTestResult, mutationResult?: SecurityTestResult): string {
  const tests = [schemathesisResult, k6Result, mutationResult]
  const testTypes: Array<'schemathesis' | 'k6' | 'mutation'> = ['schemathesis', 'k6', 'mutation']
  const rows = tests.map((test, i) => generateSecurityTestRow(test, i, testTypes[i])).join('\n')
  
  return `<div class="security-tests-section">
    <h2>🔒 Security Test Results</h2>
    <p>Results from external security testing tools (k6, Schemathesis, Stryker)</p>
    <div class="table-controls">
      <button onclick="expandAllSecurity()" class="control-btn">Expand All</button>
      <button onclick="expandFailedSecurityOnly()" class="control-btn">Expand Failed Only</button>
      <button onclick="collapseAllSecurity()" class="control-btn">Collapse All</button>
    </div>
    <div class="test-table-scroll-container">
      <table id="securityTestTable" class="test-table">
        <thead>
          <tr>
            <th class="th-expand"></th>
            <th class="th-number">#</th>
            <th>Test Name</th>
            <th class="th-status">Status</th>
            <th class="th-duration">Duration</th>
            <th>Error Preview</th>
            <th class="th-copy">Copy</th>
            <th class="th-rerun">Re-run</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`
}

function generateStaticAnalysisRow(test: SecurityTestResult | undefined, index: number, testType: 'semgrep' | 'codeql' | 'trivy'): string {
  if (!test) {
    const names = { semgrep: '🔎 Semgrep Static Analysis', codeql: '🔬 CodeQL Static Analysis', trivy: '🛡️ Trivy Vulnerability Scanner' }
    return `<tr class="security-test-row skipped-row" data-security-id="${testType}-${index}">
      <td class="row-number">${index + 1}</td>
      <td class="test-name">${names[testType]}</td>
      <td class="status-cell">⏭️ SKIPPED</td>
      <td>-</td>
      <td class="error-preview">Not run or not available</td>
      <td class="copy-cell"></td>
      <td class="rerun-cell"><button class="rerun-btn" onclick="rerunSecurityTest('${testType}')" title="Re-run this test">🔄</button></td>
    </tr>`
  }
  
  const statusIcon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : test.status === 'warning' ? '⚠️' : '⏭️'
  const statusClass = test.status === 'failed' ? 'failed-row' : test.status === 'passed' ? 'passed-row' : test.status === 'warning' ? 'warning-row' : 'skipped-row'
  const statusText = test.status === 'warning' ? 'WARNING' : test.status.toUpperCase()
  const duration = test.duration ? formatDuration(test.duration * 1000) : '-'
  
  let errorPreview = '-'
  if (test.status === 'failed' || test.status === 'warning') {
    if (test.errorType === 'not_installed') {
      errorPreview = 'Tool not installed - ' + (test.installCommand || 'install required')
    } else if (test.errorType === 'encoding_error') {
      errorPreview = 'Encoding error - ' + (test.workaround || 'Windows console issue')
    } else if (test.findings !== undefined && test.findings > 0) {
      errorPreview = `${test.findings} security finding${test.findings === 1 ? '' : 's'} detected`
    } else if (test.vulnerabilities !== undefined && test.vulnerabilities > 0) {
      errorPreview = `${test.vulnerabilities} critical/high vulnerabilit${test.vulnerabilities === 1 ? 'y' : 'ies'} found`
    } else if (test.errorMessage) {
      errorPreview = escapeHtml(test.errorMessage.substring(0, 80))
    } else if (test.summary) {
      errorPreview = escapeHtml(test.summary.substring(0, 80))
    }
  } else if (test.summary) {
    errorPreview = escapeHtml(test.summary.substring(0, 80))
  } else if (test.findings !== undefined) {
    errorPreview = `${test.findings} finding${test.findings === 1 ? '' : 's'}`
  }
  
  const detailsId = `security-details-${testType}-${index}`
  
  const copyData = JSON.stringify({
    test: test.name,
    type: testType,
    status: test.status,
    exitCode: test.exitCode,
    errorType: test.errorType,
    duration: test.duration,
    errorMessage: test.errorMessage,
    summary: test.summary,
    findings: test.findings,
    vulnerabilities: test.vulnerabilities,
    error: test.output,
  }, null, 2)
  
  let detailsContent = generateSecurityTestDetails(test, testType)
  if (test.findings !== undefined) {
    const findingsStatus = test.findings > 0 ? 'failed' : 'passed'
    detailsContent += `<div style="background: ${findingsStatus === 'failed' ? '#2d1b1b' : '#1b2d1b'}; border-left: 4px solid ${findingsStatus === 'failed' ? '#ff6b6b' : '#51cf66'}; padding: 15px; margin: 15px 0; border-radius: 4px;">`
    detailsContent += `<h4 style="margin-top: 0; color: ${findingsStatus === 'failed' ? '#ff6b6b' : '#51cf66'};">${findingsStatus === 'failed' ? '❌' : '✅'} Findings: ${test.findings} ${test.findings === 1 ? 'finding' : 'findings'}</h4>`
    if (test.findings > 0 && test.parsedFindings && test.parsedFindings.length > 0) {
      // Group findings by ruleId
      const groupedFindings = test.parsedFindings.reduce((acc, f) => {
        if (!acc[f.ruleId]) acc[f.ruleId] = []
        acc[f.ruleId].push(f)
        return acc
      }, {} as Record<string, ParsedFinding[]>)

      detailsContent += `<div style="margin-top: 15px;">`
      for (const [ruleId, findings] of Object.entries(groupedFindings)) {
        detailsContent += `<div style="margin-bottom: 15px; padding: 10px; background: #1e1e1e; border-radius: 4px;">`
        detailsContent += `<h5 style="margin: 0 0 10px 0; color: #ffd93d;">[${findings.length}] ${escapeHtml(ruleId)}</h5>`
        detailsContent += `<ul style="margin: 0; padding-left: 20px; list-style: none;">`
        for (const finding of findings) {
          const shortFile = finding.file.replace(/^.*[/\\](src[/\\])/, '$1')
          detailsContent += `<li style="margin: 5px 0; font-family: monospace; font-size: 12px;">`
          detailsContent += `<span style="color: #9cdcfe;">${escapeHtml(shortFile)}:${finding.line}</span>`
          if (finding.message && finding.message.length < 120) {
            detailsContent += `<br><span style="color: #808080; font-size: 11px; margin-left: 10px;">${escapeHtml(finding.message)}</span>`
          }
          detailsContent += `</li>`
        }
        detailsContent += `</ul></div>`
      }
      detailsContent += `</div>`
    } else if (test.findings > 0) {
      detailsContent += `<p style="color: #ff6b6b; font-weight: bold;">Security issues detected - review findings in full output or SARIF file.</p>`
    } else {
      detailsContent += `<p style="color: #51cf66;">No security findings detected.</p>`
    }
    detailsContent += `</div>`
  }
  if (test.vulnerabilities !== undefined) {
    const vulnStatus = test.vulnerabilities > 0 ? 'failed' : 'passed'
    detailsContent += `<div style="background: ${vulnStatus === 'failed' ? '#2d1b1b' : '#1b2d1b'}; border-left: 4px solid ${vulnStatus === 'failed' ? '#ff6b6b' : '#51cf66'}; padding: 15px; margin: 15px 0; border-radius: 4px;">`
    detailsContent += `<h4 style="margin-top: 0; color: ${vulnStatus === 'failed' ? '#ff6b6b' : '#51cf66'};">${vulnStatus === 'failed' ? '❌' : '✅'} Vulnerabilities: ${test.vulnerabilities} CRITICAL/HIGH ${test.vulnerabilities === 1 ? 'vulnerability' : 'vulnerabilities'}</h4>`
    if (test.vulnerabilities > 0) {
      detailsContent += `<p style="color: #ff6b6b; font-weight: bold;">Critical or high severity vulnerabilities found - immediate action required.</p>`
    } else {
      detailsContent += `<p style="color: #51cf66;">No critical or high severity vulnerabilities detected.</p>`
    }
    detailsContent += `</div>`
  }
  if (test.sarifPath) {
    detailsContent += `<h4 style="margin-top: 15px;">SARIF Results:</h4><p><code>${escapeHtml(test.sarifPath)}</code></p>`
  }
  if (test.resultsPath) {
    detailsContent += `<h4 style="margin-top: 15px;">Full Results:</h4><p><code>${escapeHtml(test.resultsPath)}</code></p>`
  }
  
  return `<tr class="security-test-row ${statusClass}" data-security-id="${testType}-${index}" data-original-number="${index + 1}">
    <td class="expand-icon" id="security-icon-${testType}-${index}" onclick="toggleSecurityDetails('${testType}', ${index})">▶</td>
    <td class="row-number">${index + 1}</td>
    <td class="test-name" title="${escapeHtml(test.name)}" onclick="toggleSecurityDetails('${testType}', ${index})">${escapeHtml(test.name)}</td>
    <td class="status-cell" onclick="toggleSecurityDetails('${testType}', ${index})">${statusIcon} ${statusText}</td>
    <td onclick="toggleSecurityDetails('${testType}', ${index})">${duration}</td>
    <td class="error-preview" title="${errorPreview !== '-' ? escapeHtml(errorPreview) : ''}" onclick="toggleSecurityDetails('${testType}', ${index})">${errorPreview}</td>
    <td class="copy-cell" onclick="event.stopPropagation(); copySecurityDetails('${testType}', ${index}, \`${escapeJsTemplateLiteral(copyData)}\`)">
      <span class="copy-icon" title="Copy test details">📋</span>
    </td>
    <td class="rerun-cell">
      <button class="rerun-btn" onclick="event.stopPropagation(); rerunSecurityTest('${testType}')" title="Re-run this test">🔄</button>
    </td>
  </tr>
  <tr class="security-details-row" id="${detailsId}">
    <td colspan="8" class="details-cell">
      <div class="details-content">${detailsContent}</div>
    </td>
  </tr>`
}

function generateStaticAnalysisSection(semgrepResult?: SecurityTestResult, codeqlResult?: SecurityTestResult, trivyResult?: SecurityTestResult): string {
  const tests = [semgrepResult, codeqlResult, trivyResult]
  const testTypes: Array<'semgrep' | 'codeql' | 'trivy'> = ['semgrep', 'codeql', 'trivy']
  const rows = tests.map((test, i) => generateStaticAnalysisRow(test, i, testTypes[i])).join('\n')
  
  return `<div class="security-tests-section">
    <h2>🔍 Static Analysis Results</h2>
    <p>Results from static analysis and vulnerability scanning tools</p>
    <div class="table-controls">
      <button onclick="expandAllSecurity()" class="control-btn">Expand All</button>
      <button onclick="expandFailedSecurityOnly()" class="control-btn">Expand Failed Only</button>
      <button onclick="collapseAllSecurity()" class="control-btn">Collapse All</button>
    </div>
    <div class="test-table-scroll-container">
      <table id="staticAnalysisTable" class="test-table">
        <thead>
          <tr>
            <th class="th-expand"></th>
            <th class="th-number">#</th>
            <th>Test Name</th>
            <th class="th-status">Status</th>
            <th class="th-duration">Duration</th>
            <th>Error Preview</th>
            <th class="th-copy">Copy</th>
            <th class="th-rerun">Re-run</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`
}

async function loadCollectedLogsFromSqlite(runId: string | null, runType: RunType | null): Promise<Map<string, string[]>> {
  const logsMap = new Map<string, string[]>()
  if (!runId) return logsMap

  try {
    const db = await TestLogDuckDb.create(getDefaultDbPath())
    try {
      const allTests = await db.getTestsByRunId(runId)
      const tests = runType ? allTests.filter(t => t.run_type === runType) : allTests
      for (const test of tests) {
        const logs = await db.getTestLogs(test.test_name, test.run_id)
        if (logs.length > 0) {
          const key = `${test.test_file}|${test.test_name}`
          const logMessages = logs.map(log => {
            const level = log.level.toUpperCase()
            const source = log.source ? `[${log.source}]` : ''
            const context = log.context ? `[${log.context}]` : ''
            const timestamp = new Date(log.log_timestamp).toISOString()
            let logLine = `[${timestamp}] ${level}${source}${context} ${log.message}`
            if (log.data) {
              try {
                logLine += ` ${JSON.stringify(JSON.parse(log.data))}`
              } catch {
                logLine += ` ${log.data}`
              }
            }
            return logLine
          })
          logsMap.set(key, logMessages)
        }
      }
    } finally {
      await db.close()
    }
  } catch (error) {
    console.warn(`⚠️  Could not load logs from DuckDB: ${error instanceof Error ? error.message : String(error)}`)
  }
  return logsMap
}

function buildVitestOutputFromTestRuns(tests: import('@ocentra/logging-domain/test-log/types').TestRun[]): VitestOutput {
  const byFile = new Map<string, typeof tests>()
  for (const t of tests) {
    const key = t.test_file
    if (!byFile.has(key)) byFile.set(key, [])
    byFile.get(key)!.push(t)
  }
  const testResults: VitestTestFile[] = []
  let numPassed = 0
  let numFailed = 0
  let numPending = 0
  let startTime = Number.MAX_SAFE_INTEGER
  let endTime = 0
  for (const [file, fileTests] of byFile.entries()) {
    const assertionResults: VitestAssertionResult[] = fileTests.map((t) => {
      const status = t.status === 'passed' ? 'passed' : t.status === 'failed' || t.status === 'timeout' ? 'failed' : 'skipped'
      if (status === 'passed') numPassed++
      else if (status === 'failed') numFailed++
      else numPending++
      const ts = t.run_timestamp
      if (ts < startTime) startTime = ts
      if (t.duration_ms != null && ts + t.duration_ms > endTime) endTime = ts + t.duration_ms
      else if (ts > endTime) endTime = ts
      const ancestorTitles = t.test_suite ? t.test_suite.split(' > ') : []
      return {
        ancestorTitles,
        fullName: t.test_full_name,
        status,
        title: t.test_name,
        duration: t.duration_ms ?? undefined,
        failureMessages: t.error_message ? [t.error_message] : [],
      }
    })
    const passed = fileTests.every((t) => t.status === 'passed')
    testResults.push({
      name: file,
      status: passed ? 'passed' : 'failed',
      assertionResults,
      startTime: Math.min(...fileTests.map((t) => t.run_timestamp)),
      endTime: Math.max(...fileTests.map((t) => t.run_timestamp + (t.duration_ms ?? 0))),
    })
  }
  if (startTime === Number.MAX_SAFE_INTEGER) startTime = Date.now()
  if (endTime === 0) endTime = startTime
  const numTotal = numPassed + numFailed + numPending
  return {
    numTotalTestSuites: testResults.length,
    numPassedTestSuites: testResults.filter((f) => f.status === 'passed').length,
    numFailedTestSuites: testResults.filter((f) => f.status === 'failed').length,
    numPendingTestSuites: 0,
    numTotalTests: numTotal,
    numPassedTests: numPassed,
    numFailedTests: numFailed,
    numPendingTests: numPending,
    numTodoTests: 0,
    testResults,
    startTime,
    success: numFailed === 0,
  }
}

async function getRunIdAndType(): Promise<{ runId: string | null; runType: RunType | null }> {
  let runId: string | null = null
  let runType: RunType | null = null
  if (existsSync(currentRunPath)) {
    try {
      const runInfo = JSON.parse(readFileSync(currentRunPath, 'utf-8'))
      runId = runInfo.runId || null
    } catch (error) {
      console.warn(`⚠️  Could not read current-run.json: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (runId) {
    try {
      const db = await TestLogDuckDb.create(getDefaultDbPath())
      try {
        const tests = await db.getTestsByRunId(runId)
        if (tests.length > 0) runType = tests[0].run_type
      } finally {
        await db.close()
      }
    } catch (error) {
      console.warn(`⚠️  Could not determine run type: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { runId, runType }
}

async function generateReport(vitestData: VitestOutput, coverageData?: CoverageSummary, schemathesisResult?: SecurityTestResult, k6Result?: SecurityTestResult, mutationResult?: SecurityTestResult, semgrepResult?: SecurityTestResult, codeqlResult?: SecurityTestResult, trivyResult?: SecurityTestResult): Promise<void> {
  const { runId, runType } = await getRunIdAndType()
  const collectedLogs = await loadCollectedLogsFromSqlite(runId, runType)
  const cssContent = existsSync(cssPath) ? readFileSync(cssPath, 'utf-8') : ''
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)
  
  const hasProductionTests = vitestData.testResults.some(file => 
    file.name.includes('production') || file.name.includes('real-cloudflare')
  )
  const isRealMode = process.env.TEST_MODE === 'real' || process.env.TEST_MODE === 'cloud' || 
                     hasProductionTests || 
                     (process.env.WORKER_URL && process.env.WORKER_URL.includes('workers.dev'))
  
  const totalTests = vitestData.numTotalTests
  const passed = vitestData.numPassedTests
  const failed = vitestData.numFailedTests
  const skipped = vitestData.numPendingTests
  
  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100 * 10) / 10 : 0


  const status =
    failed === 0
      ? 'ALL TESTS PASSED'
      : passRate >= 70
        ? 'MOSTLY PASSING'
        : 'NEEDS ATTENTION'

  const allTests: ProcessedTest[] = []
  
  vitestData.testResults.forEach(testFile => {
    testFile.assertionResults.forEach(assertion => {
      const suiteName = assertion.ancestorTitles.length > 0 
        ? assertion.ancestorTitles.join(' > ')
        : 'Root'
      
      const testKey = `${testFile.name}|${assertion.title}`
      const capturedLogs = collectedLogs.get(testKey)
      
      allTests.push({
        name: assertion.title,
        status: assertion.status,
        duration: assertion.duration,
        suite: suiteName,
        file: testFile.name,
        failureMessages: assertion.failureMessages || [],
        stdout: assertion.stdout,
        stderr: assertion.stderr,
        logs: capturedLogs ? capturedLogs.map(log => ({ type: 'log', content: log })) : (assertion.logs || [])
      })
    })
  })


  const failedTests = allTests.filter(t => t.status === 'failed')
  const passedTests = allTests.filter(t => t.status === 'passed')
  const skippedTests = allTests.filter(t => t.status === 'skipped' || t.status === 'pending')
  
  const uniqueSuites = new Set(allTests.map(t => t.suite))
  const suiteStats = Array.from(uniqueSuites).reduce((acc, suite) => {
    const suiteTests = allTests.filter(t => t.suite === suite)
    const suiteFailed = suiteTests.filter(t => t.status === 'failed').length
    acc.total++
    if (suiteFailed === 0) acc.passed++
    else acc.failed++
    return acc
  }, { total: 0, passed: 0, failed: 0 })

  const summaryTableRows = allTests.map((test, i) => {
    const originalIndex = i
    const statusIcon = test.status === 'passed' ? '✅' : test.status === 'skipped' || test.status === 'pending' ? '⏭️' : '❌'
    const statusClass = test.status === 'failed' ? 'failed-row' : test.status === 'passed' ? 'passed-row' : 'skipped-row'
    const error = test.failureMessages.length > 0 ? escapeHtml(test.failureMessages[0].substring(0, 80)) : '-'
    const detailsId = `test-details-${originalIndex}`
    
    const hasLogs = (test.stdout && test.stdout.length > 0) || (test.stderr && test.stderr.length > 0) || (test.logs && test.logs.length > 0)
    const logsSection = hasLogs ? `
      <h4 style="margin-top: 20px; color: #4ec9b0;">📋 Test Logs:</h4>
      ${test.stdout && test.stdout.length > 0 ? `
        <div style="margin: 10px 0;">
          <strong style="color: #cccccc;">STDOUT:</strong>
          <pre style="background: #1e1e1e; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 400px; overflow-y: auto;"><code style="color: #cccccc;">${escapeHtml(test.stdout.join('\n'))}</code></pre>
        </div>
      ` : ''}
      ${test.stderr && test.stderr.length > 0 ? `
        <div style="margin: 10px 0;">
          <strong style="color: #ff6b6b;">STDERR:</strong>
          <pre style="background: #2d1b1b; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 400px; overflow-y: auto;"><code style="color: #ff6b6b;">${escapeHtml(test.stderr.join('\n'))}</code></pre>
        </div>
      ` : ''}
      ${test.logs && test.logs.length > 0 ? `
        <div style="margin: 10px 0;">
          <strong style="color: #ffd93d;">Console Logs:</strong>
          <pre style="background: #2d2b1b; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 400px; overflow-y: auto;"><code style="color: #ffd93d;">${escapeHtml(test.logs.map(log => `[${log.type}] ${log.content}`).join('\n'))}</code></pre>
        </div>
      ` : ''}
    ` : ''
    
    const errorDetails = `
      <tr class="details-row" id="${detailsId}">
        <td colspan="8" class="details-cell">
          <div class="details-content">
            <strong>File:</strong> <code>${escapeHtml(test.file)}</code><br>
            <strong>Suite:</strong> ${escapeHtml(test.suite)}<br>
            <strong>Duration:</strong> ${formatDuration(test.duration)}<br>
            <strong>Status:</strong> ${test.status.toUpperCase()}<br>
            ${test.failureMessages.length > 0 ? `<h4 style="margin-top: 15px; color: #ff6b6b;">❌ Error Details:</h4>
            ${test.failureMessages.map(msg => `<pre style="background: #2d1b1b; padding: 10px; border-radius: 4px; overflow-x: auto;"><code style="color: #ff6b6b;">${escapeHtml(msg)}</code></pre>`).join('')}` : '<p>Test passed successfully.</p>'}
            ${logsSection}
          </div>
        </td>
      </tr>`
    
     const copyData = JSON.stringify({
       test: test.name,
       suite: test.suite,
       file: test.file,
       status: test.status,
       duration: test.duration,
       error: test.failureMessages.join('\n\n'),
       stdout: test.stdout,
       stderr: test.stderr,
       logs: test.logs
     }, null, 2);
     
     return `<tr class="test-row ${statusClass}" data-test-id="${originalIndex}" data-original-number="${originalIndex + 1}">
       <td class="expand-icon" id="icon-${originalIndex}" onclick="toggleTestDetails(${originalIndex})">▶</td>
       <td class="row-number">${originalIndex + 1}</td>
       <td class="test-name" title="${escapeHtml(test.name)}" onclick="toggleTestDetails(${originalIndex})">${escapeHtml(test.name)}</td>
       <td class="suite-cell" title="${escapeHtml(test.suite)}" onclick="toggleTestDetails(${originalIndex})">${escapeHtml(test.suite)}</td>
       <td class="status-cell" onclick="toggleTestDetails(${originalIndex})">${statusIcon} ${test.status.toUpperCase()}</td>
       <td onclick="toggleTestDetails(${originalIndex})">${formatDuration(test.duration)}</td>
       <td class="error-preview" title="${error !== '-' ? escapeHtml(error) : ''}" onclick="toggleTestDetails(${originalIndex})">${error}</td>
       <td class="copy-cell" onclick="event.stopPropagation(); copyTestDetails(${originalIndex}, \`${escapeJsTemplateLiteral(copyData)}\`)">
         <span class="copy-icon" title="Copy test details">📋</span>
       </td>
     </tr>${errorDetails}`
  }).join('\n')



  const failedTestsJson = JSON.stringify(failedTests.map(test => ({
    name: test.name,
    suite: test.suite,
    file: test.file,
    status: test.status,
    duration: test.duration,
    failureMessages: test.failureMessages,
    stdout: test.stdout,
    stderr: test.stderr,
    logs: test.logs,
    fullError: test.failureMessages.join('\n\n')
  })), null, 2)

  const failedTestsFileName = 'failed-tests.json'
  const failedTestsLogPath = join(testRunnerLogsDir, failedTestsFileName)
  
  if (failedTests.length > 0) {
    try {
      if (!existsSync(testRunnerLogsDir)) {
        mkdirSync(testRunnerLogsDir, { recursive: true })
      }
      writeFileSync(failedTestsLogPath, failedTestsJson, 'utf-8')
      console.log(`\n📥 Saved failed tests JSON to: ${failedTestsLogPath}`)
    } catch (error) {
      console.warn(`\n⚠️  Could not save failed tests JSON to logs directory: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const report = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - All Tests</title>
  <style>
${cssContent}
  </style>
</head>
<body>
  <div class="container">
    <h1>Cloudflare Worker Test Report</h1>
    
    <div class="header-info">
      <p><strong>Test Mode:</strong> <span class="${isRealMode ? 'test-mode-indicator-real' : 'test-mode-indicator'}">${isRealMode ? '⚠️ REAL CLOUDFLARE WORKER' : '✓ LOCAL TEST WORKER'}</span></p>
      ${isRealMode && process.env.WORKER_URL ? `<p><strong>Worker URL:</strong> ${escapeHtml(process.env.WORKER_URL)}</p>` : ''}
      <p><strong>Generated:</strong> ${escapeHtml(timestamp)}</p>
      <p><strong>Status:</strong> ${escapeHtml(status)}</p>
       <p><strong>Total Tests:</strong> ${totalTests} total | <strong>Passed:</strong> ${passed} ✅ | <strong>Failed:</strong> ${failed} ❌ | <strong>Skipped:</strong> ${skipped} ⏭️ | <strong>Pass Rate:</strong> ${passRate}%</p>
       <p><strong>Test Suites (describe blocks):</strong> ${suiteStats.total} total, ${suiteStats.passed} passed, ${suiteStats.failed} failed</p>
       <p><strong>Test Files:</strong> ${vitestData.numTotalTestSuites} files</p>
    </div>
    
    <h2>🧪 Test Summary Table (Click rows to expand/collapse details)</h2>
    <p><strong>${failedTests.length} Failed</strong> | <strong>${passedTests.length} Passed</strong> | <strong>${skippedTests.length} Skipped</strong></p>
    <div class="table-controls">
      <button onclick="expandAll()" class="control-btn">Expand All</button>
      <button onclick="expandFailedOnly()" class="control-btn">Expand Failed Only</button>
      <button onclick="collapseAll()" class="control-btn">Collapse All</button>
      <button onclick="showFailedOnly()" class="control-btn">Show Failed Only</button>
      <button onclick="showAll()" class="control-btn">Show All</button>
      <button onclick="exportFailedTests()" class="control-btn" style="background: #ff6b6b; color: white;">📥 Export Failed Tests (JSON)</button>
      <input type="text" id="searchInput" placeholder="Search tests..." class="search-input" onkeyup="filterTests()">
    </div>
    <div class="test-table-scroll-container">
      <table id="testTable" class="test-table">
        <thead>
          <tr>
            <th class="th-expand"></th>
            <th class="th-number">#</th>
            <th class="sortable" onclick="sortTable('name')" title="Click to sort by Test Name">
              Test Name <span id="sort-indicator-name" class="sort-indicator"></span>
            </th>
            <th class="sortable" onclick="sortTable('suite')" title="Click to sort by Suite">
              Suite <span id="sort-indicator-suite" class="sort-indicator"></span>
            </th>
            <th class="sortable th-status" onclick="sortTable('status')" title="Click to sort by Status">
              Status <span id="sort-indicator-status" class="sort-indicator"></span>
            </th>
            <th class="sortable th-duration" onclick="sortTable('duration')" title="Click to sort by Duration">
              Duration <span id="sort-indicator-duration" class="sort-indicator"></span>
            </th>
            <th class="sortable" onclick="sortTable('error')" title="Click to sort by Error Preview">
              Error Preview <span id="sort-indicator-error" class="sort-indicator"></span>
            </th>
            <th class="th-copy">Copy</th>
          </tr>
        </thead>
        <tbody>
          ${summaryTableRows}
        </tbody>
      </table>
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background: #252526; border-radius: 4px; border-left: 4px solid #ff6b6b;">
      <h3 style="margin-top: 0; color: #ff6b6b;">📥 Export Failed Tests</h3>
      <p style="color: #cccccc; margin-bottom: 10px;">Export all ${failedTests.length} failing test(s) with full error messages, logs, stdout, and stderr to JSON file.</p>
      ${failedTests.length > 0 ? `<p style="color: #4ec9b0; margin-bottom: 10px; font-weight: bold;">✅ Auto-saved to: <code>infra/cloudflare/test-runner/logs/failed-tests.json</code></p>` : ''}
      <button onclick="exportFailedTests()" class="control-btn" style="background: #ff6b6b; color: white; font-weight: bold;">📥 Export to Logs Directory</button>
      <p style="color: #808080; font-size: 12px; margin-top: 10px;">The JSON file includes: test name, suite, file path, duration, error messages, stdout, stderr, and console logs.</p>
      ${failedTests.length > 0 ? `<p style="color: #808080; font-size: 12px; margin-top: 5px;">💡 <strong>Note:</strong> Failed tests are automatically exported to <code>infra/cloudflare/test-runner/logs/failed-tests.json</code> on every test run. Click the button to export/override the file.</p>` : ''}
    </div>
    
    ${generateCoverageSection(coverageData, existsSync(coverageHtmlPath))}
    
    ${generateSecurityTestsSection(schemathesisResult, k6Result, mutationResult)}
    
    ${generateStaticAnalysisSection(semgrepResult, codeqlResult, trivyResult)}
    
    <div class="footer">
      <p>Report generated by Cloudflare Worker Test Suite</p>
    </div>
  </div>
  
  <script>
    function toggleTestDetails(testId) {
      const row = document.querySelector(\`tr[data-test-id="\${testId}"]\`);
      const detailsRow = document.getElementById(\`test-details-\${testId}\`);
      const icon = document.getElementById(\`icon-\${testId}\`);
      
      if (!row || !detailsRow) return;
      
      const isExpanded = row.classList.contains('expanded');
      
      if (isExpanded) {
        row.classList.remove('expanded');
        detailsRow.style.display = 'none';
        if (icon) icon.textContent = '▶';
      } else {
        row.classList.add('expanded');
        detailsRow.style.display = 'table-row';
        if (icon) icon.textContent = '▼';
      }
    }
    
    function expandAll() {
      document.querySelectorAll('.test-row').forEach(row => {
        if (row.style.display === 'none') return;
        const testId = row.getAttribute('data-test-id');
        if (testId) {
          const detailsRow = document.getElementById(\`test-details-\${testId}\`);
          const icon = document.getElementById(\`icon-\${testId}\`);
          if (detailsRow) {
            row.classList.add('expanded');
            detailsRow.style.display = 'table-row';
            if (icon) icon.textContent = '▼';
          }
        }
      });
    }
     
     function expandFailedOnly() {
       document.querySelectorAll('.test-row.failed-row').forEach(row => {
         const testId = row.getAttribute('data-test-id');
         if (testId) {
           const detailsRow = document.getElementById(\`test-details-\${testId}\`);
           const icon = document.getElementById(\`icon-\${testId}\`);
           if (detailsRow) {
             row.classList.add('expanded');
             detailsRow.style.display = 'table-row';
             if (icon) icon.textContent = '▼';
           }
         }
       });
     }
     
     function copyTestDetails(testId, testData) {
       navigator.clipboard.writeText(testData).then(() => {
         const icon = document.querySelector(\`tr[data-test-id="\${testId}"] .copy-icon\`);
         if (icon) {
           const original = icon.textContent;
           icon.textContent = '✓';
           icon.style.color = '#4ec9b0';
           setTimeout(() => {
             icon.textContent = original;
             icon.style.color = '';
           }, 2000);
         }
       }).catch(err => {
         console.error('Failed to copy:', err);
         alert('Failed to copy to clipboard');
       });
     }
    
    function collapseAll() {
      document.querySelectorAll('.test-row').forEach(row => {
        const testId = row.getAttribute('data-test-id');
        if (testId) {
          const detailsRow = document.getElementById(\`test-details-\${testId}\`);
          const icon = document.getElementById(\`icon-\${testId}\`);
          if (detailsRow && detailsRow.style.display !== 'none') {
            row.classList.remove('expanded');
            detailsRow.style.display = 'none';
            if (icon) icon.textContent = '▶';
          }
        }
      });
    }
    
    function updateRowNumbers() {
      let visibleCount = 0;
      document.querySelectorAll('.test-row').forEach(row => {
        if (row.style.display !== 'none') {
          visibleCount++;
          const numberCell = row.querySelector('.row-number');
          if (numberCell) {
            numberCell.textContent = visibleCount;
          }
        }
      });
    }
    
    function showFailedOnly() {
      let visibleCount = 0;
      document.querySelectorAll('.test-row').forEach(row => {
        if (row.classList.contains('failed-row')) {
          row.style.display = '';
          visibleCount++;
          const numberCell = row.querySelector('.row-number');
          if (numberCell) {
            numberCell.textContent = visibleCount;
          }
          const testId = row.getAttribute('data-test-id');
          if (testId) {
            const detailsRow = document.getElementById(\`test-details-\${testId}\`);
            if (detailsRow) detailsRow.style.display = 'none';
          }
        } else {
          row.style.display = 'none';
          const testId = row.getAttribute('data-test-id');
          if (testId) {
            const detailsRow = document.getElementById(\`test-details-\${testId}\`);
            if (detailsRow) detailsRow.style.display = 'none';
          }
        }
      });
    }
    
    function showAll() {
      let visibleCount = 0;
      document.querySelectorAll('.test-row').forEach(row => {
        row.style.display = '';
        visibleCount++;
        const originalNumber = row.getAttribute('data-original-number');
        const numberCell = row.querySelector('.row-number');
        if (numberCell && originalNumber) {
          numberCell.textContent = originalNumber;
        }
        const testId = row.getAttribute('data-test-id');
        if (testId) {
          const detailsRow = document.getElementById(\`test-details-\${testId}\`);
          if (detailsRow) {
            if (row.classList.contains('expanded')) {
              detailsRow.style.display = 'table-row';
            } else {
              detailsRow.style.display = 'none';
            }
          }
        }
      });
    }
    
    let currentSortColumn = null;
    let currentSortDirection = 'asc';
    
    function sortTable(column) {
      const tbody = document.querySelector('#testTable tbody');
      if (!tbody) return;
      
      const rows = Array.from(tbody.querySelectorAll('.test-row'));
      const detailsRows = new Map();
      
      rows.forEach(row => {
        const testId = row.getAttribute('data-test-id');
        if (testId) {
          const detailsRow = document.getElementById(\`test-details-\${testId}\`);
          if (detailsRow) {
            detailsRows.set(testId, detailsRow);
          }
        }
      });
      
      if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
      }
      
      rows.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
          case 'name':
            aValue = a.querySelector('.test-name')?.textContent.trim().toLowerCase() || '';
            bValue = b.querySelector('.test-name')?.textContent.trim().toLowerCase() || '';
            break;
          case 'suite':
            aValue = a.querySelector('.suite-cell')?.textContent.trim().toLowerCase() || '';
            bValue = b.querySelector('.suite-cell')?.textContent.trim().toLowerCase() || '';
            break;
          case 'status':
            const statusOrder = { 'failed': 0, 'skipped': 1, 'pending': 1, 'passed': 2 };
            const aStatus = a.getAttribute('data-test-id') ? 
              (a.classList.contains('failed-row') ? 'failed' : 
               a.classList.contains('skipped-row') ? 'skipped' : 'passed') : '';
            const bStatus = b.getAttribute('data-test-id') ? 
              (b.classList.contains('failed-row') ? 'failed' : 
               b.classList.contains('skipped-row') ? 'skipped' : 'passed') : '';
            aValue = statusOrder[aStatus] !== undefined ? statusOrder[aStatus] : 999;
            bValue = statusOrder[bStatus] !== undefined ? statusOrder[bStatus] : 999;
            break;
          case 'duration':
            const aDurationText = a.cells[5]?.textContent.trim() || '';
            const bDurationText = b.cells[5]?.textContent.trim() || '';
            aValue = parseDuration(aDurationText);
            bValue = parseDuration(bDurationText);
            break;
          case 'error':
            aValue = a.querySelector('.error-preview')?.textContent.trim().toLowerCase() || '';
            bValue = b.querySelector('.error-preview')?.textContent.trim().toLowerCase() || '';
            break;
          default:
            return 0;
        }
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        return currentSortDirection === 'asc' ? comparison : -comparison;
      });
      
      rows.forEach(row => {
        tbody.appendChild(row);
        const testId = row.getAttribute('data-test-id');
        if (testId && detailsRows.has(testId)) {
          tbody.appendChild(detailsRows.get(testId));
        }
        const originalNumber = row.getAttribute('data-original-number');
        const numberCell = row.querySelector('.row-number');
        if (numberCell && originalNumber) {
          numberCell.textContent = originalNumber;
        }
      });
      
      updateSortIndicators();
    }
    
    function parseDuration(durationStr) {
      if (!durationStr || durationStr === '-') return 0;
      const match = durationStr.match(/(\\d+(?:\\.\\d+)?)(ms|s)/);
      if (!match) return 0;
      const value = parseFloat(match[1]);
      if (match[2] === 'ms') return value;
      if (match[2] === 's') return value * 1000;
      return value;
    }
    
    function updateSortIndicators() {
      const indicators = ['name', 'suite', 'status', 'duration', 'error'];
      indicators.forEach(col => {
        const indicator = document.getElementById(\`sort-indicator-\${col}\`);
        if (indicator) {
          if (currentSortColumn === col) {
            indicator.textContent = currentSortDirection === 'asc' ? ' ▲' : ' ▼';
            indicator.style.color = '#4ec9b0';
          } else {
            indicator.textContent = '';
          }
        }
      });
    }
    
    function filterTests() {
      const input = document.getElementById('searchInput');
      const filter = input.value.toLowerCase();
      const rows = document.querySelectorAll('.test-row');
      
      rows.forEach(row => {
        const testName = row.querySelector('.test-name')?.textContent.toLowerCase() || '';
        const suite = row.cells[3]?.textContent.toLowerCase() || '';
        const matches = testName.includes(filter) || suite.includes(filter);
        
        if (matches) {
          row.style.display = '';
          const testId = row.getAttribute('data-test-id');
          if (testId) {
            const detailsRow = document.getElementById(\`test-details-\${testId}\`);
            if (detailsRow && row.classList.contains('expanded')) {
              detailsRow.style.display = 'table-row';
            }
          }
        } else {
          row.style.display = 'none';
          const testId = row.getAttribute('data-test-id');
          if (testId) {
            const detailsRow = document.getElementById(\`test-details-\${testId}\`);
            if (detailsRow) detailsRow.style.display = 'none';
          }
        }
      });
    }
    
    const failedTestsData = ${failedTestsJson};
    const failedTestsFilePath = ${failedTests.length > 0 ? `'infra/cloudflare/test-runner/logs/failed-tests.json'` : 'null'};
    
    function exportFailedTests() {
      if (!failedTestsData || failedTestsData.length === 0) {
        alert('No failed tests to export.');
        return;
      }
      
      const dataStr = JSON.stringify(failedTestsData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'failed-tests.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      if (failedTestsFilePath) {
        const message = \`✅ File ready to save!\\n\\nSave it to:\\n\${failedTestsFilePath}\\n\\n(Overwrites existing file)\\n\\nTotal failed tests: \${failedTestsData.length}\`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(failedTestsFilePath).then(() => {
            alert(message + '\\n\\n✅ File path copied to clipboard!');
          }).catch(() => {
            alert(message);
          });
        } else {
          alert(message);
        }
      }
    }
    
    function toggleCoverageDetails(coverageId) {
      const row = document.querySelector(\`tr[data-coverage-id="\${coverageId}"]\`);
      const detailsRow = document.getElementById(\`coverage-details-\${coverageId}\`);
      const icon = document.getElementById(\`coverage-icon-\${coverageId}\`);
      
      if (!row || !detailsRow) return;
      
      const isExpanded = row.classList.contains('expanded');
      
      if (isExpanded) {
        row.classList.remove('expanded');
        detailsRow.style.display = 'none';
        if (icon) icon.textContent = '▶';
      } else {
        row.classList.add('expanded');
        detailsRow.style.display = 'table-row';
        if (icon) icon.textContent = '▼';
      }
    }
    
    function expandAllCoverage() {
      document.querySelectorAll('.coverage-file-row').forEach(row => {
        if (row.style.display === 'none') return;
        const coverageId = row.getAttribute('data-coverage-id');
        if (coverageId) {
          const detailsRow = document.getElementById(\`coverage-details-\${coverageId}\`);
          const icon = document.getElementById(\`coverage-icon-\${coverageId}\`);
          if (detailsRow) {
            row.classList.add('expanded');
            detailsRow.style.display = 'table-row';
            if (icon) icon.textContent = '▼';
          }
        }
      });
    }
    
    function expandFailedCoverageOnly() {
      document.querySelectorAll('.coverage-file-row.coverage-failed').forEach(row => {
        const coverageId = row.getAttribute('data-coverage-id');
        if (coverageId) {
          const detailsRow = document.getElementById(\`coverage-details-\${coverageId}\`);
          const icon = document.getElementById(\`coverage-icon-\${coverageId}\`);
          if (detailsRow) {
            row.classList.add('expanded');
            detailsRow.style.display = 'table-row';
            if (icon) icon.textContent = '▼';
          }
        }
      });
    }
    
    function collapseAllCoverage() {
      document.querySelectorAll('.coverage-file-row').forEach(row => {
        const coverageId = row.getAttribute('data-coverage-id');
        if (coverageId) {
          const detailsRow = document.getElementById(\`coverage-details-\${coverageId}\`);
          const icon = document.getElementById(\`coverage-icon-\${coverageId}\`);
          if (detailsRow && detailsRow.style.display !== 'none') {
            row.classList.remove('expanded');
            detailsRow.style.display = 'none';
            if (icon) icon.textContent = '▶';
          }
        }
      });
    }
    
    function showFailedCoverageOnly() {
      document.querySelectorAll('.coverage-file-row').forEach(row => {
        if (row.classList.contains('coverage-failed')) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
          const coverageId = row.getAttribute('data-coverage-id');
          if (coverageId) {
            const detailsRow = document.getElementById(\`coverage-details-\${coverageId}\`);
            if (detailsRow) detailsRow.style.display = 'none';
          }
        }
      });
    }
    
    function showAllCoverage() {
      document.querySelectorAll('.coverage-file-row').forEach(row => {
        row.style.display = '';
        const coverageId = row.getAttribute('data-coverage-id');
        if (coverageId) {
          const detailsRow = document.getElementById(\`coverage-details-\${coverageId}\`);
          if (detailsRow) {
            if (row.classList.contains('expanded')) {
              detailsRow.style.display = 'table-row';
            } else {
              detailsRow.style.display = 'none';
            }
          }
        }
      });
    }
    
    function filterCoverage() {
      const input = document.getElementById('coverageSearchInput');
      const filter = input.value.toLowerCase();
      const rows = document.querySelectorAll('.coverage-file-row');
      
      rows.forEach(row => {
        const fileName = row.querySelector('.coverage-file-name')?.textContent.toLowerCase() || '';
        const matches = fileName.includes(filter);
        
        if (matches) {
          row.style.display = '';
          const coverageId = row.getAttribute('data-coverage-id');
          if (coverageId) {
            const detailsRow = document.getElementById(\`coverage-details-\${coverageId}\`);
            if (detailsRow && row.classList.contains('expanded')) {
              detailsRow.style.display = 'table-row';
            }
          }
        } else {
          row.style.display = 'none';
          const coverageId = row.getAttribute('data-coverage-id');
          if (coverageId) {
            const detailsRow = document.getElementById(\`coverage-details-\${coverageId}\`);
            if (detailsRow) detailsRow.style.display = 'none';
          }
        }
      });
    }
    
    function toggleSecurityDetails(testType, index) {
      const row = document.querySelector(\`tr[data-security-id="\${testType}-\${index}"]\`);
      const detailsRow = document.getElementById(\`security-details-\${testType}-\${index}\`);
      const icon = document.getElementById(\`security-icon-\${testType}-\${index}\`);
      
      if (!row || !detailsRow) return;
      
      const isExpanded = row.classList.contains('expanded');
      
      if (isExpanded) {
        row.classList.remove('expanded');
        detailsRow.style.display = 'none';
        if (icon) icon.textContent = '▶';
      } else {
        row.classList.add('expanded');
        detailsRow.style.display = 'table-row';
        if (icon) icon.textContent = '▼';
      }
    }
    
    function copySecurityDetails(testType, index, testData) {
      navigator.clipboard.writeText(testData).then(() => {
        const icon = document.querySelector(\`tr[data-security-id="\${testType}-\${index}"] .copy-icon\`);
        if (icon) {
          const original = icon.textContent;
          icon.textContent = '✓';
          icon.style.color = '#4ec9b0';
          setTimeout(() => {
            icon.textContent = original;
            icon.style.color = '';
          }, 2000);
        }
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
      });
    }
    
    function rerunSecurityTest(testType) {
      const testMap = {
        schemathesis: 'schemathesis',
        k6: 'k6',
        mutation: 'mutation',
        semgrep: 'static-analysis',
        codeql: 'static-analysis',
        trivy: 'static-analysis'
      };
      
      const skipTests = ['vitest', 'coverage', 'analytics', 'observability'];
      if (testType === 'schemathesis' || testType === 'k6') {
        skipTests.push('mutation', 'static-analysis');
      } else if (testType === 'mutation') {
        skipTests.push('schemathesis', 'k6', 'static-analysis');
      } else {
        skipTests.push('schemathesis', 'k6', 'mutation');
      }
      
      const command = \`npx tsx tests/run-all-tests.ts local --skip-tests=\${skipTests.join(',')}\`;
      
      navigator.clipboard.writeText(command).then(() => {
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✓';
        button.style.backgroundColor = '#51cf66';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = '';
        }, 2000);
        alert(\`Command copied to clipboard!\\n\\n\${command}\\n\\nPaste and run in terminal, then refresh this page.\`);
      }).catch(err => {
        console.error('Failed to copy command:', err);
        alert(\`Run this command in terminal:\\n\\n\${command}\\n\\nThen refresh this page.\`);
      });
    }
    
    function expandAllSecurity() {
      document.querySelectorAll('.security-test-row').forEach(row => {
        if (row.style.display === 'none') return;
        const securityId = row.getAttribute('data-security-id');
        if (securityId) {
          const [testType, index] = securityId.split('-');
          const detailsRow = document.getElementById(\`security-details-\${testType}-\${index}\`);
          const icon = document.getElementById(\`security-icon-\${testType}-\${index}\`);
          if (detailsRow) {
            row.classList.add('expanded');
            detailsRow.style.display = 'table-row';
            if (icon) icon.textContent = '▼';
          }
        }
      });
    }
    
    function expandFailedSecurityOnly() {
      document.querySelectorAll('.security-test-row.failed-row, .security-test-row.warning-row').forEach(row => {
        const securityId = row.getAttribute('data-security-id');
        if (securityId) {
          const [testType, index] = securityId.split('-');
          const detailsRow = document.getElementById(\`security-details-\${testType}-\${index}\`);
          const icon = document.getElementById(\`security-icon-\${testType}-\${index}\`);
          if (detailsRow) {
            row.classList.add('expanded');
            detailsRow.style.display = 'table-row';
            if (icon) icon.textContent = '▼';
          }
        }
      });
    }
    
    function collapseAllSecurity() {
      document.querySelectorAll('.security-test-row').forEach(row => {
        const securityId = row.getAttribute('data-security-id');
        if (securityId) {
          const [testType, index] = securityId.split('-');
          const detailsRow = document.getElementById(\`security-details-\${testType}-\${index}\`);
          const icon = document.getElementById(\`security-icon-\${testType}-\${index}\`);
          if (detailsRow && detailsRow.style.display !== 'none') {
            row.classList.remove('expanded');
            detailsRow.style.display = 'none';
            if (icon) icon.textContent = '▶';
          }
        }
      });
    }
    
  </script>
</body>
</html>`

  writeFileSync(reportPath, report, 'utf-8')
  console.log(`\nReport saved to: ${reportPath}`)
  
  // Note: Browser opening is handled by run-all-tests.ts to avoid double-opening
}

async function main() {
  let vitestData: VitestOutput
  const { runId, runType } = await getRunIdAndType()

  if (existsSync(vitestJsonPath)) {
    vitestData = JSON.parse(readFileSync(vitestJsonPath, 'utf-8')) as VitestOutput
    console.log('\n📋 Loaded Vitest results from test-results.json')
  } else if (runId) {
    try {
      const db = await TestLogDuckDb.create(getDefaultDbPath())
      try {
        const tests = await db.getTestsByRunId(runId)
        if (tests.length === 0) {
          console.error(`Vitest data not found. No tests in DuckDB for runId ${runId}.`)
          console.error('   Run tests first: npm run test:helper')
          process.exit(1)
        }
        vitestData = buildVitestOutputFromTestRuns(tests)
        console.log(`\n📋 Loaded Vitest results from DuckDB (runId: ${runId}, ${tests.length} tests)`)
      } finally {
        await db.close()
      }
    } catch (error) {
      console.error(`Could not load from DuckDB: ${error instanceof Error ? error.message : String(error)}`)
      console.error(`   Run tests with: npm run test:helper`)
      process.exit(1)
    }
  } else {
    console.error(`Vitest JSON output not found: ${vitestJsonPath}`)
    console.error('   Run tests first: npm run test:helper (or vitest run --reporter=json --outputFile=test-results.json)')
    process.exit(1)
  }
  if (runId) {
    try {
      const db = await TestLogDuckDb.create(getDefaultDbPath())
      try {
        const tests = await db.getTestsByRunId(runId)
        let logsCount = 0
        for (const test of tests) {
          const logs = await db.getTestLogs(test.test_name, test.run_id)
          logsCount += logs.length
        }
        console.log(`\n📋 Loaded logs from DuckDB: ${tests.length} tests, ${logsCount} log entries`)
        if (runType) {
          console.log(`   Run Type: ${runType} | Run ID: ${runId}`)
        }
      } finally {
        await db.close()
      }
    } catch (error) {
      console.warn(`\n⚠️  Could not load logs from DuckDB: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`\nℹ️  No run ID found (${currentRunPath})`)
    console.log(`   Logs are written by the domain bridge when tests run with the bridge.`)
  }
  
  let coverageData: CoverageSummary | undefined
  if (existsSync(coverageSummaryPath)) {
    try {
      coverageData = JSON.parse(readFileSync(coverageSummaryPath, 'utf-8')) as CoverageSummary
      console.log(`\n📊 Loaded Coverage data: ${Object.keys(coverageData).length - 1} files analyzed`)
    } catch (error) {
      console.warn(`\n⚠️  Could not parse Coverage summary: ${error instanceof Error ? error.message : String(error)}`)
      console.warn(`   File exists but is invalid JSON - Coverage section will show unavailable message`)
    }
  } else {
    console.log(`\nℹ️  Coverage summary not found (${coverageSummaryPath})`)
    console.log(`   Run: npm run test:coverage to generate coverage data`)
  }

  let schemathesisResult: SecurityTestResult | undefined
  if (existsSync(schemathesisJsonPath)) {
    try {
      schemathesisResult = JSON.parse(readFileSync(schemathesisJsonPath, 'utf-8')) as SecurityTestResult
      console.log(`\n🔍 Loaded Schemathesis results: ${schemathesisResult.status}`)
    } catch (error) {
      console.warn(`\n⚠️  Could not parse Schemathesis results: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`\nℹ️  Schemathesis results not found (${schemathesisJsonPath})`)
  }

  let k6Result: SecurityTestResult | undefined
  if (existsSync(k6JsonPath)) {
    try {
      k6Result = JSON.parse(readFileSync(k6JsonPath, 'utf-8')) as SecurityTestResult
      console.log(`\n⚡ Loaded k6 results: ${k6Result.status}`)
    } catch (error) {
      console.warn(`\n⚠️  Could not parse k6 results: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`\nℹ️  k6 results not found (${k6JsonPath})`)
  }

  let mutationResult: SecurityTestResult | undefined
  if (existsSync(mutationJsonPath)) {
    try {
      mutationResult = JSON.parse(readFileSync(mutationJsonPath, 'utf-8')) as SecurityTestResult
      console.log(`\n🧬 Loaded Mutation results: ${mutationResult.status}`)
    } catch (error) {
      console.warn(`\n⚠️  Could not parse Mutation results: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`\nℹ️  Mutation results not found (${mutationJsonPath})`)
  }

  let semgrepResult: SecurityTestResult | undefined
  if (existsSync(semgrepJsonPath)) {
    try {
      semgrepResult = JSON.parse(readFileSync(semgrepJsonPath, 'utf-8')) as SecurityTestResult
      console.log(`\n🔎 Loaded Semgrep results: ${semgrepResult.status}`)

      // If parsedFindings not present, try to parse from raw output file
      if (!semgrepResult.parsedFindings && semgrepResult.resultsPath && existsSync(semgrepResult.resultsPath)) {
        try {
          const rawContent = JSON.parse(readFileSync(semgrepResult.resultsPath, 'utf-8'))
          if (rawContent.results && Array.isArray(rawContent.results)) {
            const parsed: ParsedFinding[] = rawContent.results.map((r: {
              check_id?: string
              path?: string
              start?: { line?: number }
              message?: string
            }) => ({
              ruleId: r.check_id || 'unknown',
              level: 'warning',
              message: r.message || '',
              file: r.path || '',
              line: r.start?.line || 0,
            }))
            semgrepResult.parsedFindings = parsed
            console.log(`    Parsed ${parsed.length} findings from raw output`)
          }
        } catch (rawError) {
          console.warn(`    Could not parse Semgrep raw output: ${rawError instanceof Error ? rawError.message : String(rawError)}`)
        }
      }
    } catch (error) {
      console.warn(`\n⚠️  Could not parse Semgrep results: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`\nℹ️  Semgrep results not found (${semgrepJsonPath})`)
  }

  let codeqlResult: SecurityTestResult | undefined
  if (existsSync(codeqlJsonPath)) {
    try {
      codeqlResult = JSON.parse(readFileSync(codeqlJsonPath, 'utf-8')) as SecurityTestResult
      console.log(`\n🔬 Loaded CodeQL results: ${codeqlResult.status}`)

      // Parse SARIF file to get detailed findings
      if (codeqlResult.sarifPath && existsSync(codeqlResult.sarifPath)) {
        try {
          const sarifContent = JSON.parse(readFileSync(codeqlResult.sarifPath, 'utf-8'))
          const results = sarifContent.runs?.[0]?.results || []
          const parsedFindings: ParsedFinding[] = results.map((r: {
            ruleId?: string
            level?: string
            message?: { text?: string }
            locations?: Array<{
              physicalLocation?: {
                artifactLocation?: { uri?: string }
                region?: { startLine?: number }
              }
            }>
          }) => ({
            ruleId: r.ruleId || 'unknown',
            level: r.level || 'warning',
            message: r.message?.text || '',
            file: (r.locations?.[0]?.physicalLocation?.artifactLocation?.uri || '').replace(/^file:\/+/, ''),
            line: r.locations?.[0]?.physicalLocation?.region?.startLine || 0,
          }))
          codeqlResult.parsedFindings = parsedFindings
          console.log(`    Parsed ${parsedFindings.length} findings from SARIF`)
        } catch (sarifError) {
          console.warn(`    Could not parse SARIF file: ${sarifError instanceof Error ? sarifError.message : String(sarifError)}`)
        }
      }
    } catch (error) {
      console.warn(`\n⚠️  Could not parse CodeQL results: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`\nℹ️  CodeQL results not found (${codeqlJsonPath})`)
  }

  let trivyResult: SecurityTestResult | undefined
  if (existsSync(trivyJsonPath)) {
    try {
      trivyResult = JSON.parse(readFileSync(trivyJsonPath, 'utf-8')) as SecurityTestResult
      console.log(`\n🛡️  Loaded Trivy results: ${trivyResult.status}`)
    } catch (error) {
      console.warn(`\n⚠️  Could not parse Trivy results: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`\nℹ️  Trivy results not found (${trivyJsonPath})`)
  }
  
  await generateReport(vitestData, coverageData, schemathesisResult, k6Result, mutationResult, semgrepResult, codeqlResult, trivyResult)
}

main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})

