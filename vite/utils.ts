import type { WebSocket } from 'ws'

type StorageConfigModule = typeof import('../src/services/storage/StorageConfig')
type R2ServiceModule = typeof import('../src/adapters/storage/R2Service')

export async function dynamicImport(modulePath: string): Promise<unknown> {
  const path = modulePath
  return import(path)
}

export async function loadR2Modules() {
  const [storageConfigModule, r2ServiceModule] = await Promise.all([
    dynamicImport('./src/services/storage/StorageConfig'),
    dynamicImport('./src/adapters/storage/R2Service'),
  ]) as [StorageConfigModule, R2ServiceModule]
  return {
    getStorageConfig: storageConfigModule.getStorageConfig,
    R2Service: r2ServiceModule.R2Service,
  }
}

export function convertToR2Path(localPath: string): string {
  const path = localPath.replace(/^\/+/, '').replace(/^Resources\/?/, '')

  if (path.startsWith('Cards/')) {
    const rest = path.replace('Cards/', '')
    if (rest.startsWith('Images/')) {
      const imageFile = rest.replace('Images/', '')
      return `games/CardGames/cards/images/${imageFile}`
    }
    return `games/CardGames/cards/assets/${rest}`
  }

  if (path.startsWith('GameMode/CardGames/')) {
    const rest = path.replace('GameMode/CardGames/', '')
    const parts = rest.split('/')
    if (parts.length >= 2) {
      const gameId = parts[0]
      const fileName = parts.slice(1).join('/')
      return `games/CardGames/${gameId}/assets/${fileName}`
    }
  }

  // Map GameMode/CardGames/{game}/info.asset to pages/games/{game}/info.asset
  if (path.startsWith('GameMode/CardGames/')) {
    const rest = path.replace('GameMode/CardGames/', '')
    const parts = rest.split('/')
    if (parts.length >= 2 && parts[1] === 'info.asset') {
      const gameId = parts[0]
      return `pages/games/${gameId}/info.asset`
    }
  }

  if (path.startsWith('Pages/')) {
    const rest = path.replace('Pages/', '')
    return `pages/${rest}`
  }

  return path
}

export async function sendToBrowser(
  browserConnections: Set<WebSocket>,
  msg: { type: string; id?: string; params?: unknown },
  timeout = 10000
): Promise<unknown> {
  if (browserConnections.size === 0) {
    throw new Error('No browser connected. Please open the app in a browser tab.')
  }

  const [client] = Array.from(browserConnections)

  return new Promise((resolve, reject) => {
    const id = msg.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    msg.id = id

    const listener = (data: Buffer) => {
      try {
        const res = JSON.parse(data.toString())
        if (res.id === id) {
          client.off('message', listener)
          clearTimeout(timeoutId)
          if (res.error) {
            reject(new Error(res.error))
          } else {
            resolve(res.result)
          }
        }
      } catch {
        void 0
      }
    }

    const timeoutId = setTimeout(() => {
      client.off('message', listener)
      reject(new Error(`Timeout waiting for browser response after ${timeout}ms`))
    }, timeout)

    client.on('message', listener)
    client.send(JSON.stringify(msg))
  })
}

