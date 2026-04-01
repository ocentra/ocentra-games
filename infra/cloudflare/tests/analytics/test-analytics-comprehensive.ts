import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { LogLevel } from '@/constants/logs-api';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { TestConfig, TestEnvVar } from '../constants/test-constants';
import { formatBearerToken } from '@/utils/auth';
import { buildLogsApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const scriptDir = __dirname
const parentDir = join(scriptDir, '..')
const repoRoot = join(scriptDir, '../..')
const testRunnerReportsDir = join(parentDir, 'test-runner', 'reports')

function loadEnvFile(envPath: string): void {
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex === -1) continue
      
      const key = trimmed.substring(0, equalIndex).trim()
      const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '')
      
      if (key === 'WORKER_URL' || key === 'VITE_LOGS_WORKER_URL') {
        process.env[key] = value
      }
      if (key === 'LOGS_API_KEY' || key === 'VITE_LOGS_API_KEY') {
        process.env[key] = value
      }
      if (key === 'CLOUDFLARE_ACCOUNT_ID') {
        process.env[key] = value
      }
      if (key === 'CLOUDFLARE_API_TOKEN') {
        process.env[key] = value
      }
    }
  }
}

const localEnvFile = join(parentDir, '.env')
const localDevVarsFile = join(parentDir, '.dev.vars')
const rootEnvFile = join(repoRoot, '.env')

loadEnvFile(localEnvFile)
loadEnvFile(localDevVarsFile)
loadEnvFile(rootEnvFile)

const WORKER_URL = process.env[TestEnvVar.WorkerUrl] || process.env[TestEnvVar.ViteWorkerUrl] || TestConfig.WorkerUrlDev
const LOGS_API_KEY = process.env[TestEnvVar.LogsApiKey] || process.env[TestEnvVar.ViteLogsApiKey] || ''

const reportPath = join(testRunnerReportsDir, 'analytics-tdd-report.html')
const analyticsJsonPath = join(parentDir, 'analytics-results.json')

interface TestResult {
  name: string
  query?: string
  description: string
  success: boolean
  status?: number
  error?: string
  rows?: number
  data?: unknown
}

interface StatsResponse {
  total_logs?: number
  by_level?: Record<string, number>
  by_source?: Record<string, number>
  oldest_timestamp?: number
}

interface QueryResultResponse {
  result?: {
    data?: unknown[]
    result?: unknown[]
    rows?: number
    errors?: Array<{ message?: string }>
  }
  data?: unknown[]
}

interface QueryDataResponse {
  logs?: Array<{ level?: string; source?: string; timestamp?: number }>
}

interface QueryRow {
  full_index?: string
  count?: number | string
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function executeTest(test: { name: string; query?: string; description: string; testFunction?: () => Promise<{ status: number; data: unknown }> }): Promise<TestResult> {
  console.log(`\n[TEST ${test.name}] ${test.description}`)
  
  if (test.testFunction) {
    try {
      const result = await test.testFunction()
      console.log(`  [✓ PASS] Status: ${result.status}`)
      if (result.data && typeof result.data === 'object') {
        const dataStr = JSON.stringify(result.data, null, 2).substring(0, 400)
        console.log(`  [DATA] ${dataStr}`)
      }
      return {
        name: test.name,
        query: test.query || '',
        description: test.description,
        success: true,
        status: result.status,
        data: result.data,
      }
    } catch (error) {
      console.log(`  [✗ FAIL] Exception: ${error instanceof Error ? error.message : String(error)}`)
      return {
        name: test.name,
        query: test.query || '',
        description: test.description,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
  
  if (test.query) {
    console.log(`  Query: ${test.query}`)
  }
  
  try {
    const response = await fetch(
      buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL }),
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY),
        },
        body: JSON.stringify({ query: test.query || '' }),
      }
    )

    const responseText = await response.text()
    
    if (response.ok) {
      try {
        const wrapper = JSON.parse(responseText) as { success?: boolean; result?: { data?: unknown[]; result?: unknown[]; rows?: number; errors?: Array<{ message?: string }> }; status?: number; error?: string }
        
        if (wrapper.success === false) {
          const errorMsg = wrapper.error || 'Unknown error'
          console.log(`  [✗ FAIL] Status: ${wrapper.status || response.status}`)
          console.log(`  [ERROR] ${errorMsg.substring(0, 500)}`)
          return {
            name: test.name,
            query: test.query,
            description: test.description,
            success: false,
            status: wrapper.status || response.status,
            error: errorMsg.substring(0, 500),
          }
        }
        
        const result = wrapper.result || {}
        const data = result as { data?: unknown[]; result?: unknown[]; rows?: number; errors?: Array<{ message?: string }> }
        const rows = data.data || data.result || []
        const rowCount = data.rows || rows.length
        
        console.log(`  [✓ PASS] Status: ${response.status}, Rows: ${rowCount}`)
        if (rowCount > 0 && rowCount <= 2) {
          console.log(`  [DATA] ${JSON.stringify(rows, null, 2).substring(0, 400)}`)
        }
        
        return {
          name: test.name,
          query: test.query,
          description: test.description,
          success: true,
          status: response.status,
          rows: rowCount,
          data: rows,
        }
      } catch {
        console.log(`  [✓ PASS] Status: ${response.status}`)
        return {
          name: test.name,
          query: test.query,
          description: test.description,
          success: true,
          status: response.status,
        }
      }
    } else {
      console.log(`  [✗ FAIL] Status: ${response.status}`)
      console.log(`  [ERROR] ${responseText.substring(0, 500)}`)
      return {
        name: test.name,
        query: test.query,
        description: test.description,
        success: false,
        status: response.status,
        error: responseText.substring(0, 500),
      }
    }
  } catch (error) {
    console.log(`  [✗ FAIL] Exception: ${error instanceof Error ? error.message : String(error)}`)
    return {
      name: test.name,
      query: test.query,
      description: test.description,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runComprehensiveTests(): Promise<{ results: TestResult[]; passed: number; failed: number }> {
  console.log('[TDD] Comprehensive Analytics Engine SQL Capability Tests\n')
  console.log('This will test ALL SQL features to understand what Analytics Engine supports\n')

  if (!LOGS_API_KEY) {
    console.error('[ERROR] LOGS_API_KEY is required')
    console.error('  Set LOGS_API_KEY environment variable or add it to .env file')
    console.error('  Analytics tests will be skipped')
    
    const emptyOutput = {
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      numTotalTestSuites: 0,
      numPassedTestSuites: 0,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      testResults: [],
      startTime: Date.now(),
      success: true
    }
    
    writeFileSync(analyticsJsonPath, JSON.stringify(emptyOutput, null, 2), 'utf-8')
    console.log(`\n📊 Empty analytics results JSON saved (no API key): ${analyticsJsonPath}`)
    
    return { results: [], passed: 0, failed: 0 }
    process.exit(1)
  }
  
  const testLogId = crypto.randomUUID()
  const testTimestamp = Date.now()
  
  console.log('[SETUP] Writing test data...')
  const logsUrl = buildLogsApiUrl('', { baseUrl: WORKER_URL });
  const writeResponse = await fetch(logsUrl, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY),
    },
    body: JSON.stringify({
      logs: [{
        id: testLogId,
        level: LogLevel.Info,
        context: 'ComprehensiveTest',
        message: `[TDD] Comprehensive test - ${new Date().toISOString()}`,
        source: 'Browser:ComprehensiveTest',
        origin: 'browser',
        timestamp: testTimestamp,
      }],
    }),
  })
  
  if (!writeResponse.ok) {
    await writeResponse.text().catch(() => undefined);
    console.error('[ERROR] Failed to write test data')
    return { results: [], passed: 0, failed: 0 }
  }
  
  console.log('[OK] Test data written, waiting 5 seconds for eventual consistency...\n')
  await sleep(5000)

  console.log('[SETUP] Writing production format test logs...')
  const productionTestLogs = [
    {
      id: crypto.randomUUID(),
      level: LogLevel.Info,
      context: 'ModelManager',
      message: '[PROD-TEST] Production format test - info level',
      source: 'Browser:ModelManager',
      origin: 'browser',
      timestamp: Date.now(),
      file: 'ModelManager.ts',
      filePath: '/src/lib/ai/ModelManager.ts',
      line: 42,
      column: 10,
    },
    {
      id: crypto.randomUUID(),
      level: LogLevel.Error,
      context: 'AssetLoader',
      message: '[PROD-TEST] Production format test - error level',
      source: 'Browser:AssetLoader',
      origin: 'browser',
      timestamp: Date.now() - 1000,
      file: 'AssetLoader.ts',
      filePath: '/src/lib/assets/AssetLoader.ts',
      line: 123,
      column: 5,
      stack: 'Error: Test error\n    at AssetLoader.load (AssetLoader.ts:123:5)',
      stackFrames: [
        {
          file: 'AssetLoader.ts',
          filePath: '/src/lib/assets/AssetLoader.ts',
          line: 123,
          column: 5,
          function: 'load',
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      level: LogLevel.Warn,
      context: 'GameRegistry',
      message: '[PROD-TEST] Production format test - warn level',
      source: 'Browser:GameRegistry',
      origin: 'browser',
      timestamp: Date.now() - 2000,
      args: [{ gameId: 'test-game', status: 'loading' }],
    },
    {
      id: crypto.randomUUID(),
      level: LogLevel.Info,
      context: 'getStackTrace',
      message: 'Asset saved',
      source: 'Vite:Vite.Config',
      origin: 'browser',
      timestamp: Date.now() - 4000,
      file: 'vite.config.ts',
      filePath: 'vite.config.ts',
      line: 1426,
      column: 0,
      args: [{
        filePath: 'E:\\ocentra-games\\packages\\asset-editor\\Resources\\GameMode\\GameRegistry.asset',
        isSingleton: true,
      }],
    },
    {
      id: crypto.randomUUID(),
      level: LogLevel.Debug,
      context: 'Network',
      message: '[PROD-TEST] Production format test - debug level',
      source: 'Browser:Network',
      origin: 'browser',
      timestamp: Date.now() - 3000,
    },
  ]

  const prodLogsUrl = buildLogsApiUrl('', { baseUrl: WORKER_URL });
  const prodWriteResponse = await fetch(prodLogsUrl, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY),
    },
    body: JSON.stringify({ logs: productionTestLogs }),
  })

  console.log('[SETUP] Writing batch test logs (50 logs in one request)...')
  const batchTestLogs = Array.from({ length: 50 }, (_, i) => ({
    id: crypto.randomUUID(),
    level: i % 2 === 0 ? LogLevel.Info : LogLevel.Warn,
    context: 'BatchTest',
    message: `[BATCH-TEST] Batch log ${i + 1} of 50`,
    source: 'Browser:BatchTest',
    origin: 'browser',
    timestamp: Date.now() - (50 - i) * 100,
  }))

  const batchLogsUrl = buildLogsApiUrl('', { baseUrl: WORKER_URL });
  const batchWriteResponse = await fetch(batchLogsUrl, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY),
    },
    body: JSON.stringify({ logs: batchTestLogs }),
  })

  if (batchWriteResponse.ok) {
    const batchResult = await batchWriteResponse.json() as { success?: boolean; stored?: number }
    console.log(`[OK] Batch test: ${batchResult.stored || batchTestLogs.length} logs sent in one request`)
  } else {
    console.error('[ERROR] Batch test failed:', await batchWriteResponse.text())
  }

  let productionLogTests: Array<{ name: string; query?: string; description: string; testFunction?: () => Promise<{ status: number; data: unknown }> }> = []
  if (prodWriteResponse.ok) {
    console.log('[OK] Production format test logs written, waiting 5 seconds...\n')
    await sleep(5000)

    productionLogTests = [
      {
        name: 'PROD-1',
        description: 'Query production logs by level (info)',
        query: `SELECT blob1, timestamp FROM logs WHERE startsWith(index1, 'info:') AND position(':Browser:' IN index1) > 0 ORDER BY timestamp DESC LIMIT 10`,
      },
      {
        name: 'PROD-2',
        description: 'Query production logs by source (Browser:ModelManager)',
        query: `SELECT blob1, timestamp FROM logs WHERE position(':Browser:ModelManager:' IN index1) > 0 ORDER BY timestamp DESC LIMIT 10`,
      },
      {
        name: 'PROD-3',
        description: 'Query production logs by multiple levels',
        query: `SELECT blob1, timestamp FROM logs WHERE (startsWith(index1, 'info:') OR startsWith(index1, 'error:')) AND position(':Browser:' IN index1) > 0 ORDER BY timestamp DESC LIMIT 10`,
      },
      {
        name: 'PROD-4',
        description: 'Count production logs by level',
        query: `SELECT substring(index1, 1, position(':' IN index1) - 1) as level, COUNT() as count FROM logs WHERE position(':Browser:' IN index1) > 0 GROUP BY level`,
      },
      {
        name: 'PROD-5',
        description: 'Count production logs by source (old broken query)',
        query: `SELECT substring(index1, position(':Browser:' IN index1) + 8, position(':' IN substring(index1, position(':Browser:' IN index1) + 8)) - 1) as source, COUNT() as count FROM logs WHERE position(':Browser:' IN index1) > 0 GROUP BY source`,
      },
      {
        name: 'PROD-6',
        description: 'Stats: Total count query (matches getStatsFromAnalyticsEngine)',
        query: `SELECT COUNT() as total FROM logs WHERE double1 >= ${Math.floor(Date.now() / 1000) - 86400}`,
      },
      {
        name: 'PROD-7',
        description: 'Stats: Count by level query (matches getStatsFromAnalyticsEngine)',
        query: `SELECT substring(index1, 1, position(':' IN index1) - 1) as level, COUNT() as count FROM logs WHERE double1 >= ${Math.floor(Date.now() / 1000) - 86400} GROUP BY level`,
      },
      {
        name: 'PROD-8',
        description: 'Stats: Count by source query (matches getStatsFromAnalyticsEngine - returns full index1)',
        query: `SELECT index1 as full_index, COUNT() as count FROM logs WHERE double1 >= ${Math.floor(Date.now() / 1000) - 86400} GROUP BY index1`,
      },
      {
        name: 'PROD-9',
        description: 'Query log with complex nested args (filePath, isSingleton)',
        query: `SELECT blob1, timestamp FROM logs WHERE position(':Vite:Vite.Config:' IN index1) > 0 AND position('getStackTrace' IN blob1) > 0 ORDER BY timestamp DESC LIMIT 1`,
      },
      {
        name: 'PROD-10',
        description: 'Verify complex args are preserved in blob1 (check for filePath and isSingleton)',
        query: `SELECT blob1, timestamp FROM logs WHERE position(':Vite:Vite.Config:' IN index1) > 0 AND position('filePath' IN blob1) > 0 AND position('isSingleton' IN blob1) > 0 ORDER BY timestamp DESC LIMIT 1`,
      },
    ]

    const statsApiTest = {
      name: 'PROD-11',
      description: 'Stats API: Full stats endpoint test (matches getStatsFromAnalyticsEngine)',
      query: '',
      testFunction: async () => {
        const statsUrlNoQuery = buildLogsApiUrl(ApiEndpoint.Logs.Stats, { baseUrl: WORKER_URL });
        const response = await fetch(statsUrlNoQuery, {
          method: HttpMethod.Get,
          headers: {
            'Authorization': formatBearerToken(LOGS_API_KEY),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
        })

        if (!response.ok) {
          throw new Error(`Stats API failed: ${response.status} - ${await response.text()}`)
        }

        const stats = await response.json() as StatsResponse

        if (typeof stats.total_logs !== 'number') {
          throw new Error(`Expected total_logs to be a number, got ${typeof stats.total_logs}`)
        }

        if (!stats.by_level || typeof stats.by_level !== 'object') {
          throw new Error(`Expected by_level to be an object, got ${typeof stats.by_level}`)
        }

        if (!stats.by_source || typeof stats.by_source !== 'object') {
          throw new Error(`Expected by_source to be an object, got ${typeof stats.by_source}`)
        }

        const sourceKeys = Object.keys(stats.by_source)
        if (sourceKeys.length === 0) {
          throw new Error('Expected at least one source in by_source, got empty object')
        }

        const hasExpectedSources = sourceKeys.some(key => 
          key.includes('Browser:') || key.includes('ModelManager') || key.includes('AssetLoader')
        )
        if (!hasExpectedSources) {
          throw new Error(`Expected sources to include Browser: prefixes, got: ${sourceKeys.join(', ')}`)
        }

        return { status: 200, data: stats }
      },
    }

    const sourceExtractionTest = {
      name: 'PROD-12',
      description: 'Stats: Verify source extraction logic from index1 (level:source:origin)',
      query: '',
      testFunction: async () => {
        const oneDayAgo = Math.floor(Date.now() / 1000) - 86400
        const query = `SELECT index1 as full_index, COUNT() as count FROM logs WHERE double1 >= ${oneDayAgo} GROUP BY index1 LIMIT 20`
        
        const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
        const response = await fetch(testSqlUrl, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY),
          },
          body: JSON.stringify({ query }),
        })

        if (!response.ok) {
          throw new Error(`Query failed: ${response.status} - ${await response.text()}`)
        }

        const result = await response.json() as QueryResultResponse
        const rows = (result.result?.data || result.result?.result || result.data || []) as QueryRow[]
        
        if (rows.length === 0) {
          throw new Error('Expected at least one row from source extraction query')
        }

        const extractedSources: Record<string, number> = {}
        for (const row of rows) {
          const fullIndex = row.full_index
          if (fullIndex) {
            const parts = fullIndex.split(':')
            if (parts.length >= 3) {
              const source = parts.slice(1, -1).join(':')
              if (source) {
                extractedSources[source] = (extractedSources[source] || 0) + Number(row.count || 0)
              }
            }
          }
        }

        const sourceKeys = Object.keys(extractedSources)
        if (sourceKeys.length === 0) {
          throw new Error('Failed to extract any sources from index1 values')
        }

        const hasBrowserSources = sourceKeys.some(key => key.includes('Browser:'))
        if (!hasBrowserSources) {
          throw new Error(`Expected sources to include Browser: prefixes, got: ${sourceKeys.join(', ')}`)
        }

        return { 
          status: 200, 
          data: { 
            extractedSources,
            sampleIndex1: rows[0]?.full_index,
            totalRows: rows.length 
          } 
        }
      },
    }

    productionLogTests.push(statsApiTest, sourceExtractionTest)

    console.log('[SETUP] Writing E2E test logs with various timestamps, levels, sources, and contexts...')
    const now = Date.now()
    const e2eTestLogs = [
      { level: LogLevel.Info, source: 'Browser:ModelManager', context: 'ModelManager', timestamp: now - 30000, message: '[E2E] 30s ago - info' },
      { level: LogLevel.Info, source: 'Browser:ModelManager', context: 'ModelManager', timestamp: now - 60000, message: '[E2E] 1m ago - info' },
      { level: LogLevel.Error, source: 'Browser:AssetLoader', context: 'AssetLoader', timestamp: now - 300000, message: '[E2E] 5m ago - error' },
      { level: LogLevel.Warn, source: 'Browser:GameRegistry', context: 'GameRegistry', timestamp: now - 900000, message: '[E2E] 15m ago - warn' },
      { level: LogLevel.Debug, source: 'Browser:Network', context: 'Network', timestamp: now - 1800000, message: '[E2E] 30m ago - debug' },
      { level: LogLevel.Info, source: 'Browser:Auth', context: 'Auth', timestamp: now - 3600000, message: '[E2E] 1h ago - info' },
      { level: LogLevel.Error, source: 'Browser:ModelManager', context: 'ModelManager', timestamp: now - 7200000, message: '[E2E] 2h ago - error' },
      { level: LogLevel.Warn, source: 'Browser:AssetLoader', context: 'AssetLoader', timestamp: now - 21600000, message: '[E2E] 6h ago - warn' },
      { level: LogLevel.Info, source: 'Browser:GameRegistry', context: 'GameRegistry', timestamp: now - 86400000, message: '[E2E] 24h ago - info' },
      { level: LogLevel.Error, source: 'Browser:Network', context: 'Network', timestamp: now - 604800000, message: '[E2E] 7d ago - error' },
    ].map(log => ({
      id: crypto.randomUUID(),
      ...log,
      origin: 'browser' as const,
    }))

    const e2eLogsWriteUrl = buildLogsApiUrl('', { baseUrl: WORKER_URL });
    const e2eWriteResponse = await fetch(e2eLogsWriteUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        'Authorization': formatBearerToken(LOGS_API_KEY),
      },
      body: JSON.stringify({ logs: e2eTestLogs }),
    })

    if (e2eWriteResponse.ok) {
      console.log('[OK] E2E test logs written, waiting 5 seconds...\n')
      await sleep(5000)

      const e2eTests = [
        {
          name: 'E2E-1',
          description: 'Query: Filter by level=info',
          testFunction: async () => {
            const queryUrlE2E1Fix = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const urlE2E1Fix = new URL(queryUrlE2E1Fix);
            urlE2E1Fix.searchParams.set(QueryParam.Level, LogLevel.Info);
            urlE2E1Fix.searchParams.set(QueryParam.Limit, '100');
            const response = await fetch(urlE2E1Fix.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const allInfo = logs.every(log => log.level === LogLevel.Info)
            if (!allInfo) throw new Error(`Expected all logs to be info level, got: ${logs.map(l => l.level).join(', ')}`)
            return { status: 200, data: { count: logs.length, allInfo } }
          },
        },
        {
          name: 'E2E-2',
          description: 'Query: Filter by level=error',
          testFunction: async () => {
            const queryUrl2 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const url2 = new URL(queryUrl2);
            url2.searchParams.set(QueryParam.Level, LogLevel.Error);
            url2.searchParams.set(QueryParam.Limit, '100');
            const response = await fetch(url2.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const allError = logs.every(log => log.level === LogLevel.Error)
            if (!allError) throw new Error(`Expected all logs to be error level`)
            return { status: 200, data: { count: logs.length, allError } }
          },
        },
        {
          name: 'E2E-3',
          description: 'Query: Filter by source=Browser:ModelManager',
          testFunction: async () => {
            const queryUrl3 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const url3 = new URL(queryUrl3);
            url3.searchParams.set(QueryParam.Source, 'Browser:ModelManager');
            url3.searchParams.set(QueryParam.Limit, '100');
            const response = await fetch(url3.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const allMatch = logs.every(log => log.source === 'Browser:ModelManager')
            if (!allMatch) throw new Error(`Expected all logs to have source Browser:ModelManager`)
            return { status: 200, data: { count: logs.length, allMatch } }
          },
        },
        {
          name: 'E2E-4',
          description: 'Query: Filter by time range since=1m (should include logs from last 1 minute)',
          testFunction: async () => {
            const queryUrl4 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const url4 = new URL(queryUrl4);
            url4.searchParams.set(QueryParam.Since, '1m');
            url4.searchParams.set('limit', '100');
            const response = await fetch(url4.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const oneMinuteAgo = now - 60000
            const allRecent = logs.every(log => log.timestamp !== undefined && log.timestamp >= oneMinuteAgo)
            if (!allRecent) throw new Error(`Expected all logs to be within last 1 minute`)
            return { status: 200, data: { count: logs.length, allRecent } }
          },
        },
        {
          name: 'E2E-5',
          description: 'Query: Filter by time range since=5m (should include logs from last 5 minutes)',
          testFunction: async () => {
            const queryUrlE2E5Fix = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const urlE2E5Fix = new URL(queryUrlE2E5Fix);
            urlE2E5Fix.searchParams.set(QueryParam.Since, '5m');
            urlE2E5Fix.searchParams.set('limit', '100');
            const response = await fetch(urlE2E5Fix.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const fiveMinutesAgo = now - 300000
            const allRecent = logs.every(log => log.timestamp !== undefined && log.timestamp >= fiveMinutesAgo)
            if (!allRecent) throw new Error(`Expected all logs to be within last 5 minutes`)
            return { status: 200, data: { count: logs.length, allRecent } }
          },
        },
        {
          name: 'E2E-6',
          description: 'Query: Filter by time range since=1h (should include logs from last 1 hour)',
          testFunction: async () => {
            const queryUrl6 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const url6 = new URL(queryUrl6);
            url6.searchParams.set(QueryParam.Since, '1h');
            url6.searchParams.set('limit', '100');
            const response = await fetch(url6.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const oneHourAgo = now - 3600000
            const allRecent = logs.every(log => log.timestamp !== undefined && log.timestamp >= oneHourAgo)
            if (!allRecent) throw new Error(`Expected all logs to be within last 1 hour`)
            return { status: 200, data: { count: logs.length, allRecent } }
          },
        },
        {
          name: 'E2E-7',
          description: 'Query: Filter by time range since=24h (should include logs from last 24 hours)',
          testFunction: async () => {
            const queryUrl7 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const url7 = new URL(queryUrl7);
            url7.searchParams.set(QueryParam.Since, '24h');
            url7.searchParams.set('limit', '100');
            const response = await fetch(url7.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const oneDayAgo = now - 86400000
            const allRecent = logs.every(log => log.timestamp !== undefined && log.timestamp >= oneDayAgo)
            if (!allRecent) throw new Error(`Expected all logs to be within last 24 hours`)
            return { status: 200, data: { count: logs.length, allRecent } }
          },
        },
        {
          name: 'E2E-8',
          description: 'Query: Combined filter - level=info AND since=1h',
          testFunction: async () => {
            const queryUrlE2E8 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const urlE2E8 = new URL(queryUrlE2E8);
            urlE2E8.searchParams.set(QueryParam.Level, LogLevel.Info);
            urlE2E8.searchParams.set(QueryParam.Since, '1h');
            urlE2E8.searchParams.set(QueryParam.Limit, '100');
            const response = await fetch(urlE2E8.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const oneHourAgo = now - 3600000
            const allMatch = logs.every(log => 
              log.level === LogLevel.Info && log.timestamp !== undefined && log.timestamp >= oneHourAgo
            )
            if (!allMatch) throw new Error(`Expected all logs to be info level and within last hour`)
            return { status: 200, data: { count: logs.length, allMatch } }
          },
        },
        {
          name: 'E2E-9',
          description: 'Query: Combined filter - source=Browser:ModelManager AND level=info',
          testFunction: async () => {
            const queryUrl9 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const url9 = new URL(queryUrl9);
            url9.searchParams.set(QueryParam.Source, 'Browser:ModelManager');
            url9.searchParams.set(QueryParam.Level, LogLevel.Info);
            url9.searchParams.set(QueryParam.Limit, '100');
            const response = await fetch(url9.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const allMatch = logs.every(log => 
              log.source === 'Browser:ModelManager' && log.level === LogLevel.Info
            )
            if (!allMatch) throw new Error(`Expected all logs to match source and level`)
            return { status: 200, data: { count: logs.length, allMatch } }
          },
        },
        {
          name: 'E2E-10',
          description: 'Query: Combined filter - level=error AND since=6h',
          testFunction: async () => {
            const queryUrl10 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const url10 = new URL(queryUrl10);
            url10.searchParams.set(QueryParam.Level, LogLevel.Error);
            url10.searchParams.set(QueryParam.Since, '6h');
            url10.searchParams.set(QueryParam.Limit, '100');
            const response = await fetch(url10.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            const sixHoursAgo = now - 21600000
            const allMatch = logs.every(log => 
              log.level === LogLevel.Error && log.timestamp !== undefined && log.timestamp >= sixHoursAgo
            )
            if (!allMatch) throw new Error(`Expected all logs to be error level and within last 6 hours`)
            return { status: 200, data: { count: logs.length, allMatch } }
          },
        },
        {
          name: 'E2E-11',
          description: 'Query: Limit parameter (limit=5)',
          testFunction: async () => {
            const queryUrl11 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const url11 = new URL(queryUrl11);
            url11.searchParams.set(QueryParam.Limit, '5');
            const response = await fetch(url11.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            if (logs.length > 5) throw new Error(`Expected max 5 logs, got ${logs.length}`)
            return { status: 200, data: { count: logs.length, limitRespected: logs.length <= 5 } }
          },
        },
        {
          name: 'E2E-12',
          description: 'Stats: Filter by time range since=1h',
          testFunction: async () => {
            const oneHourAgo = Math.floor((now - 3600000) / 1000)
            const statsUrlE2E12Final = buildLogsApiUrl(ApiEndpoint.Logs.Stats, { baseUrl: WORKER_URL });
            const statsUrlE2E12FinalWithQuery = new URL(statsUrlE2E12Final);
            statsUrlE2E12FinalWithQuery.searchParams.set(QueryParam.Since, '1h');
            const response = await fetch(statsUrlE2E12FinalWithQuery.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Stats failed: ${response.status}`)
            const stats = await response.json() as StatsResponse
            if (typeof stats.total_logs !== 'number') throw new Error(`Expected total_logs to be a number`)
            if (stats.oldest_timestamp && stats.oldest_timestamp < oneHourAgo) {
              throw new Error(`Expected oldest_timestamp to be within last hour`)
            }
            return { status: 200, data: { total: stats.total_logs, hasLevels: !!stats.by_level, hasSources: !!stats.by_source } }
          },
        },
        {
          name: 'E2E-13',
          description: 'Stats: Filter by time range since=24h',
          testFunction: async () => {
            const statsUrl2 = buildLogsApiUrl(ApiEndpoint.Logs.Stats, { baseUrl: WORKER_URL });
            const statsUrl2WithQuery = new URL(statsUrl2);
            statsUrl2WithQuery.searchParams.set(QueryParam.Since, '24h');
            const response = await fetch(statsUrl2WithQuery.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Stats failed: ${response.status}`)
            const stats = await response.json() as StatsResponse
            if (typeof stats.total_logs !== 'number') throw new Error(`Expected total_logs to be a number`)
            return { status: 200, data: { total: stats.total_logs, hasLevels: !!stats.by_level, hasSources: !!stats.by_source } }
          },
        },
        {
          name: 'E2E-14',
          description: 'Query: Verify logs are sorted by timestamp DESC (newest first)',
          testFunction: async () => {
            const queryUrlE2E14 = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
            const urlE2E14 = new URL(queryUrlE2E14);
            urlE2E14.searchParams.set(QueryParam.Limit, '10');
            const response = await fetch(urlE2E14.toString(), {
              headers: { [HttpHeader.Authorization]: formatBearerToken(LOGS_API_KEY) },
            })
            if (!response.ok) throw new Error(`Query failed: ${response.status}`)
            const data = await response.json() as QueryDataResponse
            const logs = data.logs || []
            if (logs.length < 2) return { status: 200, data: { sorted: true, count: logs.length } }
            for (let i = 0; i < logs.length - 1; i++) {
              const currentTimestamp = logs[i]?.timestamp
              const nextTimestamp = logs[i + 1]?.timestamp
              if (currentTimestamp !== undefined && nextTimestamp !== undefined && currentTimestamp < nextTimestamp) {
                throw new Error(`Logs not sorted DESC: log ${i} (${currentTimestamp}) < log ${i + 1} (${nextTimestamp})`)
              }
            }
            return { status: 200, data: { sorted: true, count: logs.length } }
          },
        },
      ]

      productionLogTests.push(...e2eTests.map(t => ({ ...t, query: '' })))
    } else {
      console.log('[WARN] Failed to write E2E test logs, skipping E2E tests\n')
    }
  } else {
    console.log('[WARN] Failed to write production format test logs, skipping production tests\n')
  }

  const tests = [
    // Basic tests
    { name: 'BASIC-1', query: "SELECT 'Hello' AS msg", description: 'Basic string literal' },
    { name: 'BASIC-2', query: 'SELECT 42 AS num', description: 'Basic number literal' },
    { name: 'BASIC-3', query: 'SHOW TABLES', description: 'List tables' },
    
    // COUNT tests
    { name: 'COUNT-1', query: 'SELECT COUNT() FROM logs', description: 'COUNT() with no args' },
    { name: 'COUNT-2', query: 'SELECT COUNT() as total FROM logs', description: 'COUNT() with alias' },
    
    // SELECT tests
    { name: 'SELECT-1', query: 'SELECT * FROM logs LIMIT 1', description: 'SELECT all columns' },
    { name: 'SELECT-2', query: 'SELECT blob1 FROM logs LIMIT 1', description: 'SELECT blob1' },
    { name: 'SELECT-3', query: 'SELECT timestamp FROM logs LIMIT 1', description: 'SELECT timestamp' },
    { name: 'SELECT-4', query: 'SELECT double1 FROM logs LIMIT 1', description: 'SELECT double1' },
    { name: 'SELECT-5', query: 'SELECT index1 FROM logs LIMIT 1', description: 'SELECT index1' },
    { name: 'SELECT-6', query: 'SELECT _sample_interval FROM logs LIMIT 1', description: 'SELECT _sample_interval' },
    { name: 'SELECT-7', query: 'SELECT blob1, timestamp FROM logs LIMIT 1', description: 'SELECT multiple columns' },
    { name: 'SELECT-8', query: 'SELECT blob1 as entry FROM logs LIMIT 1', description: 'SELECT with alias' },
    { name: 'SELECT-9', query: 'SELECT DISTINCT index1 FROM logs LIMIT 10', description: 'SELECT DISTINCT' },
    
    // WHERE tests
    { name: 'WHERE-1', query: `SELECT blob1 FROM logs WHERE index1 = 'info:Browser:ComprehensiveTest:browser' LIMIT 1`, description: 'WHERE with = (exact match)' },
    { name: 'WHERE-2', query: `SELECT blob1 FROM logs WHERE index1 != 'other' LIMIT 1`, description: 'WHERE with != (not equal)' },
    { name: 'WHERE-3', query: `SELECT blob1 FROM logs WHERE double1 >= ${testTimestamp - 60000} LIMIT 1`, description: 'WHERE with >= (numeric comparison)' },
    { name: 'WHERE-4', query: `SELECT blob1 FROM logs WHERE double1 <= ${testTimestamp + 60000} LIMIT 1`, description: 'WHERE with <= (numeric comparison)' },
    { name: 'WHERE-5', query: `SELECT blob1 FROM logs WHERE double1 > ${testTimestamp - 60000} LIMIT 1`, description: 'WHERE with > (numeric comparison)' },
    { name: 'WHERE-6', query: `SELECT blob1 FROM logs WHERE double1 < ${testTimestamp + 60000} LIMIT 1`, description: 'WHERE with < (numeric comparison)' },
    { name: 'WHERE-7', query: `SELECT blob1 FROM logs WHERE timestamp >= toDateTime(${Math.floor(testTimestamp / 1000) - 60}) LIMIT 1`, description: 'WHERE with timestamp >= toDateTime()' },
    { name: 'WHERE-8', query: `SELECT blob1 FROM logs WHERE timestamp <= toDateTime(${Math.floor(testTimestamp / 1000) + 60}) LIMIT 1`, description: 'WHERE with timestamp <= toDateTime()' },
    { name: 'WHERE-9', query: `SELECT blob1 FROM logs WHERE index1 = 'info:Browser:ComprehensiveTest:browser' AND double1 >= ${testTimestamp - 60000} LIMIT 1`, description: 'WHERE with AND' },
    { name: 'WHERE-10', query: `SELECT blob1 FROM logs WHERE index1 = 'info:Browser:ComprehensiveTest:browser' OR index1 = 'other' LIMIT 1`, description: 'WHERE with OR' },
    { name: 'WHERE-11', query: `SELECT blob1 FROM logs WHERE index1 IN ('info:Browser:ComprehensiveTest:browser', 'other') LIMIT 1`, description: 'WHERE with IN operator' },
    { name: 'WHERE-12', query: `SELECT blob1 FROM logs WHERE double1 BETWEEN ${testTimestamp - 60000} AND ${testTimestamp + 60000} LIMIT 1`, description: 'WHERE with BETWEEN operator' },
    { name: 'WHERE-13', query: `SELECT blob1 FROM logs WHERE blob1 IS NULL LIMIT 1`, description: 'WHERE with IS NULL' },
    { name: 'WHERE-14', query: `SELECT blob1 FROM logs WHERE blob1 IS NOT NULL LIMIT 1`, description: 'WHERE with IS NOT NULL' },
    
    // String function tests
    { name: 'STRING-1', query: `SELECT blob1 FROM logs WHERE startsWith(index1, 'info:') LIMIT 1`, description: 'startsWith() function' },
    { name: 'STRING-2', query: `SELECT blob1 FROM logs WHERE position(':Browser:' IN index1) > 0 LIMIT 1`, description: 'position() function' },
    { name: 'STRING-3', query: `SELECT blob1 FROM logs WHERE index1 LIKE 'info:%' LIMIT 1`, description: 'LIKE operator (may not work)' },
    { name: 'STRING-4', query: `SELECT blob1 FROM logs WHERE match(index1, 'info:.*') LIMIT 1`, description: 'match() regex function (may not work)' },
    { name: 'STRING-5', query: `SELECT splitByChar(':', index1) FROM logs LIMIT 1`, description: 'splitByChar() function' },
    { name: 'STRING-6', query: `SELECT splitByChar(':', index1)[1] as level FROM logs LIMIT 1`, description: 'splitByChar() with array access' },
    { name: 'STRING-7', query: `SELECT substring(index1, 1, 5) FROM logs LIMIT 1`, description: 'substring() function' },
    { name: 'STRING-8', query: `SELECT length(index1) FROM logs LIMIT 1`, description: 'length() function' },
    { name: 'STRING-9', query: `SELECT concat(index1, ':extra') as combined FROM logs LIMIT 1`, description: 'concat() function' },
    { name: 'STRING-10', query: `SELECT replace(index1, 'Browser', 'Client') as replaced FROM logs LIMIT 1`, description: 'replace() function' },
    { name: 'STRING-11', query: `SELECT trim('  test  ') as trimmed`, description: 'trim() function' },
    
    // ORDER BY tests
    { name: 'ORDER-1', query: 'SELECT blob1 FROM logs ORDER BY timestamp LIMIT 1', description: 'ORDER BY timestamp ASC' },
    { name: 'ORDER-2', query: 'SELECT blob1 FROM logs ORDER BY timestamp DESC LIMIT 1', description: 'ORDER BY timestamp DESC' },
    { name: 'ORDER-3', query: 'SELECT blob1, timestamp FROM logs ORDER BY timestamp DESC LIMIT 1', description: 'ORDER BY timestamp DESC (with timestamp in SELECT)' },
    { name: 'ORDER-4', query: 'SELECT blob1 FROM logs ORDER BY double1 LIMIT 1', description: 'ORDER BY double1 ASC' },
    { name: 'ORDER-5', query: 'SELECT blob1 FROM logs ORDER BY double1 DESC LIMIT 1', description: 'ORDER BY double1 DESC' },
    { name: 'ORDER-6', query: 'SELECT blob1, double1 FROM logs ORDER BY double1 DESC LIMIT 1', description: 'ORDER BY double1 DESC (with double1 in SELECT)' },
    { name: 'ORDER-7', query: 'SELECT blob1 FROM logs ORDER BY index1 LIMIT 1', description: 'ORDER BY index1 ASC' },
    { name: 'ORDER-8', query: 'SELECT blob1 FROM logs ORDER BY index1 DESC LIMIT 1', description: 'ORDER BY index1 DESC' },
    { name: 'ORDER-9', query: 'SELECT blob1 FROM logs ORDER BY _sample_interval LIMIT 1', description: 'ORDER BY _sample_interval' },
    
    // GROUP BY tests
    { name: 'GROUP-1', query: `SELECT substring(index1, 1, position(':' IN index1) - 1) as level, COUNT() FROM logs GROUP BY level`, description: 'GROUP BY with COUNT()' },
    { name: 'GROUP-2', query: `SELECT index1, COUNT() as count FROM logs GROUP BY index1`, description: 'GROUP BY index1' },
    { name: 'GROUP-3', query: `SELECT substring(index1, 1, position(':' IN index1) - 1) as level, COUNT() as count FROM logs GROUP BY level HAVING count > 0`, description: 'GROUP BY with HAVING clause' },
    
    // Aggregate tests
    { name: 'AGG-1', query: 'SELECT MIN(double1) as min_ts FROM logs', description: 'MIN() aggregate' },
    { name: 'AGG-2', query: 'SELECT MAX(double1) as max_ts FROM logs', description: 'MAX() aggregate' },
    { name: 'AGG-3', query: 'SELECT AVG(double1) as avg_ts FROM logs', description: 'AVG() aggregate' },
    { name: 'AGG-4', query: 'SELECT SUM(_sample_interval) as total_samples FROM logs', description: 'SUM() aggregate' },
    
    // CASE/WHEN tests
    { name: 'CASE-1', query: `SELECT CASE WHEN startsWith(index1, 'info:') THEN 'info' ELSE 'other' END as level_type FROM logs LIMIT 1`, description: 'CASE/WHEN statement' },
    { name: 'CASE-2', query: `SELECT CASE WHEN double1 > ${testTimestamp} THEN 'recent' WHEN double1 > ${testTimestamp - 86400000} THEN 'today' ELSE 'old' END as time_category FROM logs LIMIT 1`, description: 'CASE/WHEN with multiple conditions' },

    // NULL handling tests
    { name: 'NULL-1', query: `SELECT COALESCE(blob1, 'default') as entry FROM logs LIMIT 1`, description: 'COALESCE function' },
    { name: 'NULL-2', query: `SELECT COALESCE(blob10, blob1, 'fallback') as entry FROM logs LIMIT 1`, description: 'COALESCE with multiple values' },

    // Date/Time function tests
    { name: 'DATE-1', query: `SELECT toDateTime(${Math.floor(testTimestamp / 1000)}) as dt FROM logs LIMIT 1`, description: 'toDateTime() function' },
    { name: 'DATE-2', query: `SELECT toDate(timestamp) as date_only FROM logs LIMIT 1`, description: 'toDate() function' },
    { name: 'DATE-3', query: `SELECT formatDateTime(timestamp, '%Y-%m-%d') as formatted FROM logs LIMIT 1`, description: 'formatDateTime() function' },

    // Pagination tests
    { name: 'PAGE-1', query: `SELECT blob1 FROM logs LIMIT 10 OFFSET 0`, description: 'LIMIT with OFFSET (pagination)' },
    { name: 'PAGE-2', query: `SELECT blob1 FROM logs ORDER BY timestamp DESC LIMIT 5 OFFSET 10`, description: 'ORDER BY + LIMIT + OFFSET' },

    // Combined tests
    { name: 'COMBINE-1', query: `SELECT blob1 FROM logs WHERE startsWith(index1, 'info:') LIMIT 5`, description: 'WHERE + LIMIT' },
    { name: 'COMBINE-2', query: `SELECT blob1, double1 FROM logs WHERE double1 >= ${testTimestamp - 60000} LIMIT 5`, description: 'SELECT multiple + WHERE + LIMIT' },
    { name: 'COMBINE-3', query: `SELECT substring(index1, 1, position(':' IN index1) - 1) as level, COUNT() FROM logs WHERE double1 >= ${testTimestamp - 60000} GROUP BY level`, description: 'WHERE + GROUP BY + COUNT' },
    { name: 'COMBINE-4', query: `SELECT DISTINCT substring(index1, 1, position(':' IN index1) - 1) as level FROM logs WHERE double1 >= ${testTimestamp - 60000} LIMIT 10`, description: 'DISTINCT + WHERE + LIMIT' },
    { name: 'COMBINE-5', query: `SELECT substring(index1, 1, position(':' IN index1) - 1) as level, COUNT() as count FROM logs GROUP BY level HAVING count > 1 ORDER BY count DESC LIMIT 5`, description: 'GROUP BY + HAVING + ORDER BY + LIMIT' },
  ]

  const results: TestResult[] = []

  for (const test of tests) {
    const result = await executeTest(test)
    results.push(result)
    await sleep(300)
  }

  const productionTestResults: TestResult[] = []
  for (const test of productionLogTests) {
    const result = await executeTest(test)
    productionTestResults.push(result)
    await sleep(300)
  }

  const allResults = [...results, ...productionTestResults]
  const allPassed = allResults.filter(r => r.success).length
  const allFailed = allResults.filter(r => !r.success).length

  console.log('\n' + '='.repeat(80))
  console.log('[SUMMARY] Test Results')
  console.log('='.repeat(80))
  console.log(`Total: ${allResults.length}, Passed: ${allPassed}, Failed: ${allFailed}\n`)

  console.log('\n[PASSED TESTS]')
  allResults.filter(r => r.success).forEach(r => {
    console.log(`  ✓ ${r.name}: ${r.description}`)
  })

  console.log('\n[FAILED TESTS]')
  allResults.filter(r => !r.success).forEach(r => {
    console.log(`  ✗ ${r.name}: ${r.description}`)
    console.log(`    Error: ${r.error?.substring(0, 200)}`)
  })

  console.log('\n[CAPABILITIES DISCOVERED]')
  const capabilities = {
    COUNT: allResults.find(r => r.name.startsWith('COUNT-') && r.success) ? 'YES' : 'NO',
    WHERE: allResults.filter(r => r.name.startsWith('WHERE-') && r.success).length,
    StringFunctions: allResults.filter(r => r.name.startsWith('STRING-') && r.success).map(r => r.name).join(', ') || 'NONE',
    ORDER_BY: allResults.filter(r => r.name.startsWith('ORDER-') && r.success).map(r => r.name).join(', ') || 'NOT SUPPORTED',
    GROUP_BY: allResults.filter(r => r.name.startsWith('GROUP-') && r.success).length > 0 ? 'YES' : 'NO',
    Aggregates: allResults.filter(r => r.name.startsWith('AGG-') && r.success).map(r => r.name).join(', ') || 'NONE',
  }
  
  console.log(`  COUNT(): ${capabilities.COUNT}`)
  console.log(`  WHERE clauses: ${capabilities.WHERE}/10 working`)
  console.log(`  String functions: ${capabilities.StringFunctions}`)
  console.log(`  ORDER BY: ${capabilities.ORDER_BY}`)
  console.log(`  GROUP BY: ${capabilities.GROUP_BY}`)
  console.log(`  Aggregates: ${capabilities.Aggregates}`)

  console.log('\n[RECOMMENDATIONS]')
  if (capabilities.ORDER_BY === 'NOT SUPPORTED') {
    console.log('  ⚠ ORDER BY not supported - sort in application code')
  }
  if (!capabilities.StringFunctions.includes('STRING-3')) {
    console.log('  ⚠ LIKE not supported - use startsWith() or position()')
  }
  if (capabilities.COUNT === 'NO') {
    console.log('  ⚠ COUNT() syntax issue - check documentation')
  }

  const shouldGenerateUnifiedReport = process.env.GENERATE_UNIFIED_REPORT !== 'false'
  
  if (shouldGenerateUnifiedReport) {
    console.log('\n[INFO] Using unified report generator (analytics results will be included in main test-report.html)')
    console.log('  Analytics JSON saved - will be included when unified report is generated')
  } else {
    console.log('\n[INFO] Generating standalone analytics report')
    generateReport(allResults, allPassed, allFailed)
  }
  
  const analyticsOutput = {
    numTotalTests: allResults.length,
    numPassedTests: allPassed,
    numFailedTests: allFailed,
    numPendingTests: 0,
    testResults: allResults.map(result => ({
      name: `Analytics: ${result.name}`,
      status: result.success ? 'passed' : 'failed',
      assertionResults: [{
        ancestorTitles: ['Analytics Engine Tests'],
        fullName: `Analytics Engine Tests > ${result.name}`,
        status: result.success ? 'passed' : 'failed',
        title: result.name,
        duration: 0,
        failureMessages: result.error ? [result.error] : []
      }],
      startTime: Date.now(),
      endTime: Date.now()
    })),
    startTime: Date.now(),
    success: allFailed === 0
  }
  
  writeFileSync(analyticsJsonPath, JSON.stringify(analyticsOutput, null, 2), 'utf-8')
  console.log(`\n📊 Analytics results JSON saved to: ${analyticsJsonPath}`)
  
  if (shouldGenerateUnifiedReport) {
    console.log(`\n[INFO] To generate unified report (includes Analytics + all Vitest tests):`)
    console.log(`  npx --yes tsx ${join(parentDir, '..', 'test-runner', 'script', 'report', 'generate-test-report.ts')}`)
    console.log(`  Or run: .\\run-cloudflare.ps1 -Mode local (generates report automatically)`)
  }
  
  return { results: allResults, passed: allPassed, failed: allFailed }
}

function generateReport(results: TestResult[], passed: number, failed: number): void {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const totalTests = results.length
  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100 * 10) / 10 : 0

  const status =
    failed === 0
      ? '✅ ALL TESTS PASSED'
      : passRate >= 70
        ? '⚠️ MOSTLY PASSING'
        : '❌ NEEDS ATTENTION'

  const testSections: string[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const anchor = `test-${i}-${result.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    const statusIcon = result.success ? '✅' : '❌'
    const statusText = result.success ? 'PASS' : 'FAIL'

    const actualStatus = result.status
    const actualResponse =
      result.data != null ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)) : undefined
    
    const verdict = result.success
      ? `**✅ PASS** - Query executed successfully. Status: ${actualStatus || 'N/A'}, Rows: ${result.rows || 0}`
      : `**❌ FAIL** - ${result.error || 'Unknown error'}`
    
    const solution = result.success
      ? '✅ **Solution:** This feature works correctly and can be used in production.'
      : result.error?.includes('unsupported')
        ? '❌ **Solution:** This feature is not supported. Use alternative approach (see recommendations).'
        : result.error?.includes('unable to find type')
          ? '⚠️ **Solution:** Column must be included in SELECT clause when using ORDER BY.'
          : '❌ **Solution:** Review error message and check Analytics Engine documentation.'
    
    const testOutput = `[TEST ${result.name}] ${result.description}
  Query: ${result.query}
  ${result.success 
    ? `[✓ PASS] Status: ${actualStatus || 'N/A'}, Rows: ${result.rows || 0}`
    : `[✗ FAIL] Status: ${actualStatus || 'N/A'}
  [ERROR] ${result.error || 'Unknown error'}`}`
    
    const responseSection = actualResponse ? `
<h3>Response data:</h3>
<p><strong>Status:</strong> ${actualStatus ?? 'N/A'}</p>
<pre><code class="language-json">${escapeHtml(actualResponse)}</code></pre>
<hr>` : ''
    
    const copyButton = `<button class="copy-button" onclick="copyTestResult(${i})" title="Copy test result to clipboard">📋 Copy</button>`
    
    testSections.push(`<a id="${anchor}"></a>
<details>
<summary><strong>Test ${i + 1}: ${escapeHtml(result.name)} - ${statusIcon} ${statusText} ${copyButton}</strong></summary>
<div class="test-content" id="test-content-${i}">
<p><strong>Description:</strong> ${escapeHtml(result.description)}</p>
${result.query ? `<p><strong>Query:</strong></p>
<pre><code class="language-sql">${escapeHtml(result.query)}</code></pre>` : ''}
<hr>
<h3>From Test Output:</h3>
<pre><code>${escapeHtml(testOutput)}</code></pre>
${responseSection}
<h3>Verdict:</h3>
<p>${verdict.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>
<p>${solution.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>
</div>
</details>
`)
  }

  function escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }

  const summaryTableRows = results.map((r, i) => {
    const statusIcon = r.success ? '✅' : '❌'
    const error = r.error ? escapeHtml(r.error.substring(0, 50)) : '-'
    const anchor = `test-${i}-${r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    return `<tr>
      <td>${i + 1}</td>
      <td><a href="#${anchor}">${escapeHtml(r.name)}</a></td>
      <td>${escapeHtml(r.description)}</td>
      <td>${statusIcon}</td>
      <td>${error}</td>
    </tr>`
  }).join('\n')

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
  </table>`

  const testSectionsHtml = testSections.join('\n')

  const report = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Engine TDD Test Report</title>
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
    
    details summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Analytics Engine TDD Test Report</h1>
    
    <div class="header-info">
      <p><strong>Generated:</strong> ${escapeHtml(timestamp)}</p>
      <p><strong>Status:</strong> ${escapeHtml(status)}</p>
      <p><strong>Total Tests:</strong> ${totalTests} | <strong>Passed:</strong> ${passed} ✅ | <strong>Failed:</strong> ${failed} ❌ | <strong>Pass Rate:</strong> ${passRate}%</p>
    </div>
    
    <h2>📊 Test Summary Table</h2>
    ${summaryTable}
    
    <h2>📋 Individual Test Reports</h2>
    ${testSectionsHtml}
    
    <div class="footer">
      <p>Report generated by Analytics Engine TDD Test Suite</p>
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
</html>`

  writeFileSync(reportPath, report, 'utf-8')
  console.log(`\n✅ Report saved to: ${reportPath}`)
  
  openInBrowser(reportPath)
}

function openInBrowser(filePath: string): void {
  const platform = process.platform
  let command: string
  
  if (platform === 'win32') {
    command = `start "" "${filePath}"`
  } else if (platform === 'darwin') {
    command = `open "${filePath}"`
  } else {
    command = `xdg-open "${filePath}"`
  }
  
  exec(command, (error) => {
    if (error) {
      console.log(`\n⚠️  Could not open browser automatically. Please open: ${filePath}`)
    } else {
      console.log(`\n🌐 Opened report in browser`)
    }
  })
}

async function main() {
  try {
    await runComprehensiveTests()
    
    const autoGenerateReport = process.env.AUTO_GENERATE_REPORT === 'true'
    if (autoGenerateReport) {
      console.log('\n[INFO] Auto-generating unified report...')
      const { exec } = await import('child_process')
      const generateReportPath = join(parentDir, '..', 'test-runner', 'script', 'report', 'generate-test-report.ts')
      
      return new Promise<void>((resolve, reject) => {
        exec(`npx --yes tsx "${generateReportPath}"`, { cwd: parentDir }, (error, stdout, stderr) => {
          if (stdout) console.log(stdout)
          if (stderr && !error) console.warn(stderr)
          if (error) {
            console.error('Failed to generate unified report:', error.message)
            reject(error)
          } else {
            console.log('\n✅ Unified report generated successfully')
            resolve()
          }
        })
      })
    }
  } catch (error) {
    console.error('Unhandled error in analytics tests:', error)
    
    const errorOutput = {
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      numTotalTestSuites: 0,
      numPassedTestSuites: 0,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      testResults: [],
      startTime: Date.now(),
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
    
    try {
      writeFileSync(analyticsJsonPath, JSON.stringify(errorOutput, null, 2), 'utf-8')
      console.log(`\n📊 Error results JSON saved: ${analyticsJsonPath}`)
    } catch (writeError) {
      console.error('Failed to write error results:', writeError)
    }
    
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
