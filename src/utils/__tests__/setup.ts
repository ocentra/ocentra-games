import { vi } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'
// Import Vitest hooks to capture console logs and test results
// Disabled: vitest-hooks uses beforeEach/afterEach which causes "Vitest failed to find the runner" error in Vitest 4.x
// TODO: Migrate to Vitest reporter API instead
// import './vitest-hooks'

// Load .env file for tests (if it exists)
// This allows tests to use environment variables from .env without manual setup
const envResult = config({ path: resolve(process.cwd(), '.env') })
if (envResult.error) {
  console.warn('[SETUP] Could not load .env file:', envResult.error.message)
} else {
  console.log('[SETUP] Loaded .env file, VITE_R2_WORKER_URL:', process.env.VITE_R2_WORKER_URL || 'NOT SET')
}

type MockOpenRequest = Partial<IDBOpenDBRequest> & { readyState: IDBRequestReadyState }

const createMockRequest = (): IDBOpenDBRequest => {
  const request: MockOpenRequest = {
    result: null as unknown as IDBDatabase,
    error: null,
    onsuccess: null,
    onerror: null,
    onblocked: null,
    onupgradeneeded: null,
    readyState: 'done',
  }

  return request as IDBOpenDBRequest
}

const indexedDBMock: IDBFactory = {
  open: vi.fn((name: string, version?: number) => {
    void name
    void version
    return createMockRequest()
  }),
  deleteDatabase: vi.fn((name: string) => {
    void name
    return createMockRequest()
  }),
  cmp: vi.fn((first: unknown, second: unknown) => {
    if (first === second) return 0
    return (first as number) > (second as number) ? 1 : -1
  }),
} as unknown as IDBFactory

globalThis.indexedDB = indexedDBMock

// NOTE: We do NOT mock fetch here because:
// 1. Unit tests (R2Service.test.ts, assetManager.test.ts) mock fetch themselves in beforeEach
// 2. E2E tests (R2Service.hello.test.ts, R2Service.e2e.test.ts) need real fetch to hit the Worker
// 3. This setup file is primarily for IndexedDB mocking
// If you need fetch mocked, do it in the specific test file's beforeEach hook

// Ensure URL.createObjectURL / revokeObjectURL exist
const urlConstructor = globalThis.URL as typeof URL & {
  createObjectURL?: (obj: unknown) => string
  revokeObjectURL?: (url: string) => void
}

if (!urlConstructor.createObjectURL) {
  Object.defineProperty(urlConstructor, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    writable: true,
  })
} else {
  vi.spyOn(urlConstructor, 'createObjectURL').mockReturnValue('blob:mock-url')
}

if (!urlConstructor.revokeObjectURL) {
  Object.defineProperty(urlConstructor, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
  })
} else {
  vi.spyOn(urlConstructor, 'revokeObjectURL').mockImplementation(() => {})
}