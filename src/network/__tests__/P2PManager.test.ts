import { describe, it, expect, beforeEach, vi } from 'vitest'
import { P2PManager } from '../P2PManager'
import { ConnectionStatus } from '../types'

// Mock the WebRTC components
vi.mock('../connection/WebRTCHandler', () => ({
  WebRTCHandler: vi.fn().mockImplementation(() => ({
    onConnectionChange: vi.fn(),
    getConnectedPeers: vi.fn().mockReturnValue([]),
    getConnectionStatus: vi.fn().mockReturnValue(null),
    getNetworkStats: vi.fn().mockResolvedValue(null),
    closeAllConnections: vi.fn(),
  }))
}))

vi.mock('../connection/ConnectionRecovery', () => ({
  ConnectionRecovery: vi.fn().mockImplementation(() => ({
    onReconnectionStatus: vi.fn(),
    stopAllReconnections: vi.fn(),
    reconnectAllDisconnected: vi.fn().mockResolvedValue(undefined),
  }))
}))

vi.mock('../connection/NetworkMonitor', () => ({
  NetworkMonitor: vi.fn().mockImplementation(() => ({
    onQualityChange: vi.fn(),
    onAdaptiveChange: vi.fn(),
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    getNetworkSummary: vi.fn().mockReturnValue({}),
    isNetworkSuitableForGameplay: vi.fn().mockReturnValue(true),
  }))
}))

vi.mock('../connection/StateSync', () => ({
  StateSync: vi.fn().mockImplementation(() => ({
    onStateSync: vi.fn(),
    onAction: vi.fn(),
    onConflict: vi.fn(),
    startSync: vi.fn(),
    stopSync: vi.fn(),
    broadcastAction: vi.fn(),
    updateGameState: vi.fn(),
    forceSyncState: vi.fn(),
  }))
}))

describe('P2PManager', () => {
  let p2pManager: P2PManager
  const localPlayerId = 'local-player-id'

  beforeEach(() => {
    p2pManager = new P2PManager({
      localPlayerId,
      maxPeers: 4,
      enableNetworkMonitoring: true,
      enableAutoReconnect: true,
    })
  })

  describe('createRoom', () => {
    it('should create a new room and return room ID', async () => {
      const roomConfig = {
        maxPlayers: 4,
        isPrivate: false,
        gameSettings: { allowSpectators: true },
      }

      const roomId = await p2pManager.createRoom(roomConfig)

      expect(roomId).toBeDefined()
      expect(typeof roomId).toBe('string')
      expect(roomId.length).toBe(6) // Generated room ID length
      
      const currentRoom = p2pManager.getCurrentRoom()
      expect(currentRoom).toBeDefined()
      expect(currentRoom?.id).toBe(roomId)
      expect(currentRoom?.hostId).toBe(localPlayerId)
      expect(currentRoom?.config).toEqual(roomConfig)
    })

    it('should set host status when creating room', async () => {
      const roomConfig = {
        maxPlayers: 4,
        isPrivate: false,
        gameSettings: { allowSpectators: true },
      }

      await p2pManager.createRoom(roomConfig)

      const currentRoom = p2pManager.getCurrentRoom()
      expect(currentRoom?.hostId).toBe(localPlayerId)
    })
  })

  describe('joinRoom', () => {
    it('should join an existing room', async () => {
      const roomId = 'TEST123'

      await p2pManager.joinRoom(roomId)

      const currentRoom = p2pManager.getCurrentRoom()
      expect(currentRoom).toBeDefined()
      expect(currentRoom?.id).toBe(roomId)
      expect(currentRoom?.playerIds).toContain(localPlayerId)
    })

    it('should not be host when joining room', async () => {
      const roomId = 'TEST123'

      await p2pManager.joinRoom(roomId)

      const currentRoom = p2pManager.getCurrentRoom()
      expect(currentRoom?.hostId).not.toBe(localPlayerId)
    })
  })

  describe('leaveRoom', () => {
    it('should leave current room and clean up', async () => {
      // First create a room
      const roomConfig = {
        maxPlayers: 4,
        isPrivate: false,
        gameSettings: { allowSpectators: true },
      }
      await p2pManager.createRoom(roomConfig)

      // Verify room exists
      expect(p2pManager.getCurrentRoom()).toBeDefined()

      // Leave room
      p2pManager.leaveRoom()

      // Verify cleanup
      expect(p2pManager.getCurrentRoom()).toBeNull()
    })
  })

  describe('event callbacks', () => {
    it('should call room joined callback when room is created', async () => {
      const callback = vi.fn()
      p2pManager.onRoomJoined(callback)

      const roomConfig = {
        maxPlayers: 4,
        isPrivate: false,
        gameSettings: { allowSpectators: true },
      }

      await p2pManager.createRoom(roomConfig)

      expect(callback).toHaveBeenCalled()
      const callArgs = callback.mock.calls[0][0]
      expect(callArgs.hostId).toBe(localPlayerId)
    })

    it('should call error callback when error occurs', () => {
      const errorCallback = vi.fn()
      p2pManager.onError(errorCallback)

      // Trigger an error by trying to connect without a room
      expect(() => {
        p2pManager.sendGameAction({
          type: 'declare_intent',
          playerId: localPlayerId,
          timestamp: new Date(),
        })
      }).not.toThrow() // Should handle gracefully

      // Error callback should be called
      expect(errorCallback).toHaveBeenCalled()
    })
  })

  describe('game actions', () => {
    it('should handle game actions when room is active', async () => {
      // Create room first
      const roomConfig = {
        maxPlayers: 4,
        isPrivate: false,
        gameSettings: { allowSpectators: true },
      }
      await p2pManager.createRoom(roomConfig)

      const testAction = {
        type: 'declare_intent' as const,
        playerId: localPlayerId,
        data: { suit: 'spades' },
        timestamp: new Date(),
      }

      // Should not throw when sending action
      expect(() => {
        p2pManager.sendGameAction(testAction)
      }).not.toThrow()
    })
  })

  describe('utility methods', () => {
    it('should return empty array for connected peers initially', () => {
      const connectedPeers = p2pManager.getConnectedPeers()
      expect(connectedPeers).toEqual([])
    })

    it('should return null for connection status of non-existent peer', () => {
      const status = p2pManager.getConnectionStatus('non-existent-peer')
      expect(status).toBeNull()
    })

    it('should check network suitability', () => {
      const suitable = p2pManager.isNetworkSuitableForGameplay()
      expect(typeof suitable).toBe('boolean')
    })
  })

  describe('cleanup', () => {
    it('should clean up resources when destroyed', async () => {
      // Create room first
      const roomConfig = {
        maxPlayers: 4,
        isPrivate: false,
        gameSettings: { allowSpectators: true },
      }
      await p2pManager.createRoom(roomConfig)

      // Destroy should not throw
      expect(() => {
        p2pManager.destroy()
      }).not.toThrow()

      // Room should be null after destroy
      expect(p2pManager.getCurrentRoom()).toBeNull()
    })
  })
})