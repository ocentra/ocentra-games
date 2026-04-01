/**
 * Test Report Generator
 * Automatically generates formatted markdown reports after test runs
 *
 * This file is imported by test files to enable automatic report generation
 */

import * as fs from 'fs'
import * as path from 'path'
import { program, isLocalnet, isDevnet, isMainnet } from '@/helpers'

export interface TestReportData {
  suite: string
  test: string
  status: 'passed' | 'failed' | 'skipped'
  duration?: number
  logs?: string[]
  error?: {
    message: string
    stack?: string
    context?: Record<string, string>
  }
}

class ReportGenerator {
  private static instance: ReportGenerator
  private results: TestReportData[] = []
  private startTime: number = Date.now()

  static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator()
    }
    return ReportGenerator.instance
  }

  addResult(result: TestReportData): void {
    this.results.push(result)
  }

  generateMarkdown(): string {
    const now = new Date()
    const timestamp = now.toISOString()
    const date = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const time = now.toLocaleTimeString('en-US', { hour12: false })
    const duration = Date.now() - this.startTime

    // Group results by suite
    const suiteMap = new Map<string, TestReportData[]>()
    for (const result of this.results) {
      if (!suiteMap.has(result.suite)) {
        suiteMap.set(result.suite, [])
      }
      suiteMap.get(result.suite)!.push(result)
    }

    // Calculate suite summaries
    const suites = Array.from(suiteMap.entries()).map(([name, tests]) => {
      const passed = tests.filter(t => t.status === 'passed').length
      const failed = tests.filter(t => t.status === 'failed').length
      const skipped = tests.filter(t => t.status === 'skipped').length

      return {
        name,
        tests,
        summary: {
          total: tests.length,
          passed,
          failed,
          skipped,
        },
      }
    })

    // Calculate overall summary
    const total = this.results.length
    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const skipped = this.results.filter(r => r.status === 'skipped').length

    // Determine cluster
    let cluster = 'unknown'
    if (isLocalnet()) cluster = 'localnet'
    else if (isDevnet()) cluster = 'devnet'
    else if (isMainnet()) cluster = 'mainnet'

    // Generate markdown
    let md = `# Test Report\n\n`

    // Header
    md += `**Date:** ${date}  \n`
    md += `**Time:** ${time}  \n`
    md += `**Timestamp:** ${timestamp}  \n\n`

    // Environment
    md += `## Environment\n\n`
    md += `| Property | Value |\n`
    md += `|----------|-------|\n`
    md += `| Cluster | ${cluster} |\n`
    md += `| Program ID | \`${program.programId.toString()}\` |\n`
    md += `| Node Version | ${process.version} |\n`
    md += `| Platform | ${process.platform} |\n`
    md += `| Architecture | ${process.arch} |\n\n`

    // Summary
    md += `## Summary\n\n`
    md += `| Metric | Count | Percentage |\n`
    md += `|--------|-------|------------|\n`
    md += `| **Total Tests** | ${total} | 100% |\n`
    md += `| ✅ **Passed** | ${passed} | ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}% |\n`
    md += `| ❌ **Failed** | ${failed} | ${total > 0 ? ((failed / total) * 100).toFixed(1) : 0}% |\n`
    md += `| ⏭️ **Skipped** | ${skipped} | ${total > 0 ? ((skipped / total) * 100).toFixed(1) : 0}% |\n`
    md += `| ⏱️ **Duration** | ${(duration / 1000).toFixed(2)}s | - |\n\n`

    // Overall status
    const status = failed === 0 ? '✅ **PASSED**' : '❌ **FAILED**'
    md += `### Overall Status: ${status}\n\n`

    // Test Suites
    if (suites.length > 0) {
      md += `## Test Suites\n\n`

      for (const suite of suites) {
        const suiteStatus = suite.summary.failed === 0 ? '✅' : '❌'
        md += `### ${suiteStatus} ${suite.name}\n\n`

        md += `| Test | Status | Duration |\n`
        md += `|------|--------|----------|\n`

        for (const test of suite.tests) {
          const statusIcon =
            test.status === 'passed'
              ? '✅'
              : test.status === 'failed'
                ? '❌'
                : '⏭️'
          const duration = test.duration
            ? `${(test.duration / 1000).toFixed(3)}s`
            : '-'
          const testName = test.test.replace(/\|/g, '\\|')

          md += `| ${testName} | ${statusIcon} ${test.status} | ${duration} |\n`
        }

        md += `\n**Suite Summary:** ${suite.summary.passed} passed, ${suite.summary.failed} failed, ${suite.summary.skipped} skipped\n\n`

        // Suite logs (per-test) - embedded in markdown
        if (suite.tests.some(t => t.logs && t.logs.length > 0)) {
          md += `#### Execution Logs\n\n`
          for (const test of suite.tests) {
            const testName = test.test.replace(/\|/g, '\\|')
            md += `**${testName}**\n\n`
            if (test.logs && test.logs.length > 0) {
              md += `\`\`\`\n`
              // Trim extremely long logs per test to keep report size manageable
              const maxLines = 300
              const lines = test.logs.slice(0, maxLines)
              md += `${lines.join('\n')}\n`
              if (test.logs.length > maxLines) {
                md += `... (${test.logs.length - maxLines} more lines truncated)\n`
              }
              md += `\`\`\`\n\n`
            } else {
              md += `_no logs_\n\n`
            }
          }
        }
      }

      // Failed Tests Details
      const failedTests = suites.flatMap(s =>
        s.tests.filter(t => t.status === 'failed')
      )
      if (failedTests.length > 0) {
        md += `## Failed Tests Details\n\n`

        for (const test of failedTests) {
          md += `### ❌ ${test.suite} - ${test.test}\n\n`

          if (test.error) {
            md += `**Error Message:**\n\n`
            md += `\`\`\`\n${test.error.message}\n\`\`\`\n\n`

            if (
              test.error.context &&
              Object.keys(test.error.context).length > 0
            ) {
              md += `**Context:**\n\n`
              md += `| Key | Value |\n`
              md += `|-----|-------|\n`
              for (const [key, value] of Object.entries(test.error.context)) {
                const escapedValue = String(value)
                  .replace(/\|/g, '\\|')
                  .substring(0, 200)
                md += `| ${key} | \`${escapedValue}\` |\n`
              }
              md += `\n`
            }

            if (test.error.stack) {
              md += `**Stack Trace:**\n\n`
              md += `\`\`\`\n${test.error.stack.split('\n').slice(0, 20).join('\n')}\n\`\`\`\n\n`
            }
          }
        }
      }
    } else {
      md += `## Test Suites\n\n`
      md += `*No test results recorded.*\n\n`
    }

    // Footer
    md += `---\n\n`
    md += `*Report generated automatically*\n`
    md += `*Generated at ${timestamp}*\n`

    return md
  }

  saveReport(outputDir: string = './test-reports'): string {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Delete old reports before creating new one
    try {
      const files = fs.readdirSync(outputDir)
      const oldReports = files.filter(
        file => file.startsWith('test-report-') && file.endsWith('.md')
      )
      for (const oldReport of oldReports) {
        const oldPath = path.join(outputDir, oldReport)
        fs.unlinkSync(oldPath)
      }
      if (oldReports.length > 0) {
        console.log(`🗑️  Deleted ${oldReports.length} old test report(s)`)
      }
    } catch (err) {
      // Ignore errors when deleting old reports (e.g., permission issues)
      console.warn('Warning: Could not delete old reports:', err)
    }

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5)
    const filename = `test-report-${timestamp}.md`
    const filepath = path.join(outputDir, filename)

    // Generate markdown
    const markdown = this.generateMarkdown()

    // Write file
    fs.writeFileSync(filepath, markdown, 'utf-8')

    return filepath
  }

  reset(): void {
    this.results = []
    this.startTime = Date.now()
  }
}

// Export singleton instance
export const reportGenerator = ReportGenerator.getInstance()

// Auto-generate report on process exit
process.on('exit', () => {
  try {
    const filepath = reportGenerator.saveReport()
    console.log(`\n📄 Test report saved to: ${filepath}\n`)
  } catch (err) {
    console.error('Failed to generate test report:', err)
  }
})

// Also handle SIGINT (Ctrl+C) and uncaught exceptions
process.on('SIGINT', () => {
  try {
    const filepath = reportGenerator.saveReport()
    console.log(`\n📄 Test report saved to: ${filepath}\n`)
  } catch (err) {
    console.error('Failed to generate test report:', err)
  }
  process.exit(0)
})
