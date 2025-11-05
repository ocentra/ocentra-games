import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { WebRTCHandler } from '../connection/WebRTCHandler'
import { ConnectionStatus, NetworkMessageType } from '../types'

// Mock WebRTC APIs
class MockRTCPeerConnection {
  createDataChannel = vi.fn()
  close = vi.fn()
  getStats = vi.fn()
  oniceconnectionstatechange: any = null
  ondatachannel: any = null
  onicecandidate: any = null
  iceConnectionState = 'new'

  constructor(config: any) {
    // Mock constructor
  }
}

class MockRTCDataChannel {
  send = vi.fn()
  close = vi.fn()
  onopen: any = null
  onclose: any = null
  onerror: any = null
  onmessage: any = null
  readyState = 'connecting'
}

// Mock RTCPeerConnection
Object.defineProperty(global, 'RTCPeerConnection', {
  writable: true,
  value: MockRTCPeerConnection,
})

// Mock RTCDataChannel
Object.defineProperty(global, 'RTCDataChannel', {
  writable: true,
  value: MockRTCDataChannel,
})

describe('WebRTCHandler', () => {
  let webrtcHandler: WebRTCHandler
  let mockConnection: any
  let mockDataChannel: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Mock RTCDataChannel instance
    mockDataChannel = new MockRTCDataChannel()

    // Mock RTCPeerConnection instance  
    mockConnection = new MockRTCPeerConnection({})
    mockConnection.createDataChannel.mockReturnValue(mockDataChannel)

    webrtcHandler = new WebRTCHandler('local-player-id')
  })

  describe('createPeerConnection', () => {
    it('should create a new peer connection', async () => {
      const peerId = 'test-peer'
      
      const connection = await webrtcHandler.createPeerConnection(peerId)
      
      expect(connection).toBeInstanceOf(MockRTCPeerConnection)
    })

    it('should set up connection event handlers', async () => {
      const peerId = 'test-peer'
      
      await webrtcHandler.createPeerConnection(peerId)
      
      expect(mockConnection.oniceconnectionstatechange).toBeDefined()
      expect(mockConnection.ondatachannel).toBeDefined()
      expect(mockConnection.onicecandidate).toBeDefined()
    })
  })

  describe('createDataChannel', () => {
    it('should create a data channel for existing peer', async () => {
      const peerId = 'test-peer'
      
      await webrtcHandler.createPeerConnection(peerId)
      const dataChannel = webrtcHandler.createDataChannel(peerId)
      
      expect(mockConnection.createDataChannel).toHaveBeenCalledWith('gameData', {
        ordered: true,
        maxRetransmissions: 3,
      })
      expect(dataChannel).toBe(mockDataChannel)
    })

    it('should return null for non-existent peer', () => {
      const dataChannel = webrtcHandler.createDataChannel('non-existent-peer')
      
      expect(dataChannel).toBeNull()
    })

    it('should set up data channel event handlers', async () => {
      const peerId = 'test-peer'
      
      await webrtcHandler.createPeerConnection(peerId)
      webrtcHandler.createDataChannel(peerId)
      
      expect(mockDataChannel.onopen).toBeDefined()
      expect(mockDataChannel.onclose).toBeDefined()
      expect(mockDataChannel.onerror).toBeDefined()
      expect(mockDataChannel.onmessage).toBeDefined()
    })
  })

  describe('sendMessage', () => {
    it('should send message to connected peer', async () => {
      const peerId = 'test-peer'
      const message = {
        type: NetworkMessageType.GAME_ACTION,
        senderId: 'local-player-id',
        timestamp: Date.now(),
        data: { test: 'data' },
        messageId: 'test-message',
      }
      
      await webrtcHandler.createPeerConnection(peerId)
      webrtcHandler.createDataChannel(peerId)
      
      // Simulate open data channel
      mockDataChannel.readyState = 'open'
      
      const result = webrtcHandler.sendMessage(peerId, message)
      
      expect(result).toBe(true)
      expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify(message))
    })

    it('should return false for disconnected peer', async () => {
      const peerId = 'test-peer'
      const message = {
        type: NetworkMessageType.GAME_ACTION,
        senderId: 'local-player-id',
        timestamp: Date.now(),
        data: { test: 'data' },
        messageId: 'test-message',
      }
      
      await webrtcHandler.createPeerConnection(peerId)
      webrtcHandler.createDataChannel(peerId)
      
      // Data channel is not open
      mockDataChannel.readyState = 'closed'
      
      const result = webrtcHandler.sendMessage(peerId, message)
      
      expect(result).toBe(false)
      expect(mockDataChannel.send).not.toHaveBeenCalled()
    })
  })

  describe('getConnectionStatus', () => {
    it('should return connection status for existing peer', async () => {
      const peerId = 'test-peer'
      
      await webrtcHandler.createPeerConnection(peerId)
      
      const status = webrtcHandler.getConnectionStatus(peerId)
      
      expect(status).toBe(ConnectionStatus.CONNECTING)
    })

    it('should return null for non-existent peer', () => {
      const status = webrtcHandler.getConnectionStatus('non-existent-peer')
      
      expect(status).toBeNull()
    })
  })

  describe('getConnectedPeers', () => {
    it('should return empty array when no peers connected', () => {
      const connectedPeers = webrtcHandler.getConnectedPeers()
      
      expect(connectedPeers).toEqual([])
    })

    it('should return connected peer IDs', async () => {
      const peerId = 'test-peer'
      
      await webrtcHandler.createPeerConnection(peerId)
      webrtcHandler.createDataChannel(peerId)
      
      // Simulate connection
      mockDataChannel.onopen?.()
      
      const connectedPeers = webrtcHandler.getConnectedPeers()
      
      expect(connectedPeers).toContain(peerId)
    })
  })

  describe('closePeerConnection', () => {
    it('should close peer connection and data channel', async () => {
      const peerId = 'test-peer'
      
      await webrtcHandler.createPeerConnection(peerId)
      webrtcHandler.createDataChannel(peerId)
      
      webrtcHandler.closePeerConnection(peerId)
      
      expect(mockDataChannel.close).toHaveBeenCalled()
      expect(mockConnection.close).toHaveBeenCalled()
    })

    it('should handle closing non-existent peer gracefully', () => {
      expect(() => {
        webrtcHandler.closePeerConnection('non-existent-peer')
      }).not.toThrow()
    })
  })

  describe('event callbacks', () => {
    it('should call message callback when message received', async () => {
      const peerId = 'test-peer'
      const messageCallback = vi.fn()
      
      webrtcHandler.onMessage(messageCallback)
      
      await webrtcHandler.createPeerConnection(peerId)
      webrtcHandler.createDataChannel(peerId)
      
      const testMessage = {
        type: NetworkMessageType.GAME_ACTION,
        senderId: peerId,
        timestamp: Date.now(),
        data: { test: 'data' },
        messageId: 'test-message',
      }
      
      // Simulate message received
      mockDataChannel.onmessage?.({ data: JSON.stringify(testMessage) })
      
      expect(messageCallback).toHaveBeenCalledWith(testMessage)
    })

    it('should call connection change callback', async () => {
      const peerId = 'test-peer'
      const connectionCallback = vi.fn()
      
      webrtcHandler.onConnectionChange(connectionCallback)
      
      await webrtcHandler.createPeerConnection(peerId)
      webrtcHandler.createDataChannel(peerId)
      
      // Simulate data channel open
      mockDataChannel.onopen?.()
      
      expect(connectionCallback).toHaveBeenCalledWith(peerId, ConnectionStatus.CONNECTED)
    })
  })
})