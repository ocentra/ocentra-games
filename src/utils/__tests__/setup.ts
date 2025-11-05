import { vi } from 'vitest'

// Mock IndexedDB
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
  readyState: 'done',
}

const mockIDBDatabase = {
  createObjectStore: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  objectStoreNames: {
    contains: vi.fn(() => false),
  },
}

const mockIDBTransaction = {
  objectStore: vi.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null,
}

const mockIDBObjectStore = {
  add: vi.fn(() => mockIDBRequest),
  put: vi.fn(() => mockIDBRequest),
  get: vi.fn(() => mockIDBRequest),
  delete: vi.fn(() => mockIDBRequest),
  clear: vi.fn(() => mockIDBRequest),
  count: vi.fn(() => mockIDBRequest),
  getAll: vi.fn(() => mockIDBRequest),
  createIndex: vi.fn(),
  index: vi.fn(),
}

global.indexedDB = {
  open: vi.fn(() => ({
    ...mockIDBRequest,
    onupgradeneeded: null,
  })),
  deleteDatabase: vi.fn(() => mockIDBRequest),
} as any

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  blob: () => Promise.resolve(new Blob(['mock-data'], { type: 'image/png' })),
  text: () => Promise.resolve('mock text'),
  json: () => Promise.resolve({}),
})

// Mock URL
Object.defineProperty(global, 'URL', {
  value: class MockURL {
    static createObjectURL = vi.fn(() => 'blob:mock-url')
    static revokeObjectURL = vi.fn()
    
    constructor(url: string) {
      // Mock URL constructor
    }
  },
  writable: true,
})

// Mock Blob
global.Blob = class MockBlob {
  size: number
  type: string
  
  constructor(parts: any[], options: any = {}) {
    this.size = parts.reduce((size, part) => size + (part?.length || 0), 0)
    this.type = options.type || ''
  }
  
  text() {
    return Promise.resolve('mock text')
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size))
  }
} as any