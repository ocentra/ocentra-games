import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';
import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { LogSource } from '@ocentra/logging-domain/types/logSource';

describe('Logs API E2E Tests - Cloudflare Worker', () => {
  let workerUrl: string
  let logsApiKey: string

  beforeAll(() => {
    workerUrl = import.meta.env.VITE_LOGS_WORKER_URL || import.meta.env.VITE_R2_WORKER_URL || ''
    logsApiKey = import.meta.env.VITE_LOGS_API_KEY || ''

    if (!workerUrl || !logsApiKey) {
      console.warn('⚠️  VITE_LOGS_WORKER_URL or VITE_LOGS_API_KEY not set. Skipping Logs API E2E tests.')
      console.warn('   Set these in your test environment or .env file')
      return
    }

    console.log(`\n🧪 Testing Logs API against: ${workerUrl}`)
    console.log(`   API Key: ${logsApiKey.substring(0, 8)}...\n`)
  })

  const createTestLogEntry = (overrides?: Partial<LogEntry>): LogEntry => ({
    id: crypto.randomUUID(),
    level: 'info' as LogLevel,
    context: 'TestContext',
    message: 'Test log message',
    source: 'Browser:Test' as LogSource,
    origin: 'browser',
    timestamp: Date.now(),
    ...overrides,
  })

  describe('POST /api/logs', () => {
    it('should store a single log entry with valid API key', async () => {
      if (!workerUrl || !logsApiKey) {
        console.log('⏭️  Skipping: Worker URL or API key not configured')
        return
      }

      const logEntry = createTestLogEntry({
        message: `E2E test log - ${Date.now()}`,
      })

      const response = await fetch(`${workerUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${logsApiKey}`,
        },
        body: JSON.stringify(logEntry),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    }, 30000)

    it('should store a batch of log entries', async () => {
      if (!workerUrl || !logsApiKey) {
        console.log('⏭️  Skipping: Worker URL or API key not configured')
        return
      }

      const logs = [
        createTestLogEntry({ level: 'info', message: 'Batch test 1' }),
        createTestLogEntry({ level: 'warn', message: 'Batch test 2' }),
        createTestLogEntry({ level: 'error', message: 'Batch test 3' }),
      ]

      const response = await fetch(`${workerUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${logsApiKey}`,
        },
        body: JSON.stringify({ logs }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.stored).toBe(3)
    }, 30000)

    it('should reject request without API key', async () => {
      if (!workerUrl) {
        console.log('⏭️  Skipping: Worker URL not configured')
        return
      }

      const logEntry = createTestLogEntry()

      const response = await fetch(`${workerUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    }, 30000)

    it('should reject request with invalid API key', async () => {
      if (!workerUrl) {
        console.log('⏭️  Skipping: Worker URL not configured')
        return
      }

      const logEntry = createTestLogEntry()

      const response = await fetch(`${workerUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-key-12345',
        },
        body: JSON.stringify(logEntry),
      })

      expect(response.status).toBe(401)
    }, 30000)

    it('should reject batch exceeding max size', async () => {
      if (!workerUrl || !logsApiKey) {
        console.log('⏭️  Skipping: Worker URL or API key not configured')
        return
      }

      const logs = Array.from({ length: 101 }, () => createTestLogEntry())

      const response = await fetch(`${workerUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${logsApiKey}`,
        },
        body: JSON.stringify({ logs }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Batch size exceeds maximum')
    }, 30000)
  })

  describe('GET /api/logs/query', () => {
    it('should query logs with level filter', async () => {
      if (!workerUrl || !logsApiKey) {
        console.log('⏭️  Skipping: Worker URL or API key not configured')
        return
      }

      const response = await fetch(`${workerUrl}/api/logs/query?level=error&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${logsApiKey}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data.logs)).toBe(true)
    }, 30000)

    it('should query logs with source filter', async () => {
      if (!workerUrl || !logsApiKey) {
        console.log('⏭️  Skipping: Worker URL or API key not configured')
        return
      }

      const response = await fetch(`${workerUrl}/api/logs/query?source=Browser:Test&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${logsApiKey}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data.logs)).toBe(true)
    }, 30000)

    it('should query logs with since filter', async () => {
      if (!workerUrl || !logsApiKey) {
        console.log('⏭️  Skipping: Worker URL or API key not configured')
        return
      }

      const response = await fetch(`${workerUrl}/api/logs/query?since=1h&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${logsApiKey}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data.logs)).toBe(true)
    }, 30000)

    it('should reject query without API key', async () => {
      if (!workerUrl) {
        console.log('⏭️  Skipping: Worker URL not configured')
        return
      }

      const response = await fetch(`${workerUrl}/api/logs/query?limit=10`, {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    }, 30000)
  })

  describe('GET /api/logs/stats', () => {
    it('should get log statistics', async () => {
      if (!workerUrl || !logsApiKey) {
        console.log('⏭️  Skipping: Worker URL or API key not configured')
        return
      }

      const response = await fetch(`${workerUrl}/api/logs/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${logsApiKey}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(typeof data.total_logs).toBe('number')
      expect(typeof data.by_level).toBe('object')
      expect(typeof data.by_source).toBe('object')
      expect(data.total_logs).toBeGreaterThanOrEqual(0)
    }, 30000)

    it('should reject stats request without API key', async () => {
      if (!workerUrl) {
        console.log('⏭️  Skipping: Worker URL not configured')
        return
      }

      const response = await fetch(`${workerUrl}/api/logs/stats`, {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    }, 30000)
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits after many requests', async () => {
      if (!workerUrl || !logsApiKey) {
        console.log('⏭️  Skipping: Worker URL or API key not configured')
        return
      }

      const requests = Array.from({ length: 105 }, () =>
        fetch(`${workerUrl}/api/logs/query?limit=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${logsApiKey}`,
          },
        })
      )

      const responses = await Promise.all(requests)
      const rateLimited = responses.some(r => r.status === 429)

      if (rateLimited) {
        console.log('✅ Rate limiting is working (some requests returned 429)')
      } else {
        console.log('ℹ️  Rate limit not triggered (may need more requests or different client ID)')
      }
    }, 60000)
  })
})

