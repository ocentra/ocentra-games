import type { AssetCache } from './assetLoader'

export class IndexedDBCache implements AssetCache {
  private dbName: string
  private storeName: string
  private version: number
  private db: IDBDatabase | null = null

  constructor(dbName = 'ClaimAssetCache', storeName = 'assets', version = 1) {
    this.dbName = dbName
    this.storeName = storeName
    this.version = version
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async get(key: string): Promise<Blob | null> {
    try {
      const db = await this.openDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(key)

        request.onerror = () => {
          reject(new Error(`Failed to get asset: ${request.error}`))
        }

        request.onsuccess = () => {
          const result = request.result
          if (result && result.data) {
            // Update access timestamp
            this.updateTimestamp(key).catch(console.warn)
            resolve(result.data)
          } else {
            resolve(null)
          }
        }
      })
    } catch (error) {
      console.error('IndexedDB get error:', error)
      return null
    }
  }

  async set(key: string, data: Blob): Promise<void> {
    try {
      const db = await this.openDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        
        const record = {
          key,
          data,
          timestamp: Date.now(),
          size: data.size
        }
        
        const request = store.put(record)

        request.onerror = () => {
          reject(new Error(`Failed to store asset: ${request.error}`))
        }

        request.onsuccess = () => {
          resolve()
        }
      })
    } catch (error) {
      console.error('IndexedDB set error:', error)
      throw error
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const db = await this.openDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.count(key)

        request.onerror = () => {
          reject(new Error(`Failed to check asset existence: ${request.error}`))
        }

        request.onsuccess = () => {
          resolve(request.result > 0)
        }
      })
    } catch (error) {
      console.error('IndexedDB has error:', error)
      return false
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.delete(key)

        request.onerror = () => {
          reject(new Error(`Failed to delete asset: ${request.error}`))
        }

        request.onsuccess = () => {
          resolve()
        }
      })
    } catch (error) {
      console.error('IndexedDB delete error:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.clear()

        request.onerror = () => {
          reject(new Error(`Failed to clear cache: ${request.error}`))
        }

        request.onsuccess = () => {
          resolve()
        }
      })
    } catch (error) {
      console.error('IndexedDB clear error:', error)
      throw error
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const db = await this.openDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.getAll()

        request.onerror = () => {
          reject(new Error(`Failed to get cache stats: ${request.error}`))
        }

        request.onsuccess = () => {
          const records = request.result
          const totalSize = records.reduce((sum, record) => sum + (record.size || 0), 0)
          
          resolve({
            count: records.length,
            totalSize
          })
        }
      })
    } catch (error) {
      console.error('IndexedDB stats error:', error)
      return { count: 0, totalSize: 0 }
    }
  }

  /**
   * Clean up old assets based on LRU policy
   */
  async cleanup(maxSize: number = 50 * 1024 * 1024): Promise<void> { // 50MB default
    try {
      const stats = await this.getStats()
      
      if (stats.totalSize <= maxSize) {
        return // No cleanup needed
      }

      const db = await this.openDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const index = store.index('timestamp')
        const request = index.openCursor()

        const toDelete: string[] = []
        let currentSize = stats.totalSize

        request.onerror = () => {
          reject(new Error(`Failed to cleanup cache: ${request.error}`))
        }

        request.onsuccess = () => {
          const cursor = request.result
          
          if (cursor && currentSize > maxSize) {
            const record = cursor.value
            toDelete.push(record.key)
            currentSize -= (record.size || 0)
            cursor.continue()
          } else {
            // Delete the oldest assets
            Promise.all(toDelete.map(key => this.delete(key)))
              .then(() => resolve())
              .catch(reject)
          }
        }
      })
    } catch (error) {
      console.error('IndexedDB cleanup error:', error)
      throw error
    }
  }

  private async updateTimestamp(key: string): Promise<void> {
    try {
      const db = await this.openDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const getRequest = store.get(key)

        getRequest.onerror = () => {
          reject(new Error(`Failed to get asset for timestamp update: ${getRequest.error}`))
        }

        getRequest.onsuccess = () => {
          const record = getRequest.result
          if (record) {
            record.timestamp = Date.now()
            const putRequest = store.put(record)
            
            putRequest.onerror = () => {
              reject(new Error(`Failed to update timestamp: ${putRequest.error}`))
            }
            
            putRequest.onsuccess = () => {
              resolve()
            }
          } else {
            resolve()
          }
        }
      })
    } catch (error) {
      console.error('IndexedDB timestamp update error:', error)
    }
  }

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined'
  }
}