import { test, expect, type Page } from '@playwright/test'

test.describe('IndexedDB Layer - Comprehensive Browser E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/bootstrap/__tests__/e2e/test-harness.html', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () => typeof (window as unknown as { IndexedDBService?: unknown }).IndexedDBService !== 'undefined',
      { timeout: 10000 }
    )
  })

  async function cleanupTestDBs(page: Page): Promise<void> {
    await page.evaluate(async () => {
      const dbNames = ['TestIndexedDB', 'TestCacheDB', 'TestCRUDDB', 'TestModelCache', 'TestModelStorageDB', 'TestMigrationDB']
      for (const dbName of dbNames) {
        try {
          const deleteRequest = indexedDB.deleteDatabase(dbName)
          await new Promise<void>((resolve, reject) => {
            deleteRequest.onsuccess = () => resolve()
            deleteRequest.onerror = () => reject(deleteRequest.error)
            deleteRequest.onblocked = () => {
              setTimeout(() => resolve(), 1000)
            }
          })
        } catch {
          // Ignore cleanup errors
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    })
  }

  test('IDB-001: IndexedDBService - Basic CRUD operations', async ({ page }) => {
    await cleanupTestDBs(page)
    
    const result = await page.evaluate(async () => {
      // @ts-expect-error - test harness
      const { IndexedDBService } = window

      const service = new IndexedDBService({
        dbName: 'TestIndexedDB',
        version: 1,
        stores: {
          test: { keyPath: 'id' },
        },
      })

      const testData = { id: 'test1', name: 'Test Item', value: 42 }
      
      await service.set('test', testData)
      const retrieved = await service.get('test', 'test1')
      
      if (!retrieved || retrieved.id !== 'test1' || retrieved.name !== 'Test Item') {
        return { success: false, error: 'Data mismatch after retrieval' }
      }

      await service.delete('test', 'test1')
      const deleted = await service.get('test', 'test1')
      
      if (deleted !== null) {
        return { success: false, error: 'Item not deleted' }
      }

      return { success: true, data: { created: true, retrieved: true, deleted: true } }
    })

    expect(result.success).toBe(true)
    expect(result.data?.created).toBe(true)
    expect(result.data?.retrieved).toBe(true)
    expect(result.data?.deleted).toBe(true)
  })

  // ... rest of tests remain identical to original file ...
})
