import { describe, it, expect } from 'vitest'
import { P2PManager } from '../P2PManager'
import { ConnectionStatus, NetworkMessageType } from '../types'

// Simple integration test without WebRTC mocking
describe('P2P Networking Integration', () => {
  it('should create P2PManager instance', () => {
    const config = {
      localPlayerId: 'test-player',
      maxPeers: 4,
      enableNetworkMonitoring: true,
      enableAutoReconnect: true,
    }

    expect(() => {
      new P2PManager(config)
    }).not.toThrow()
  })

  it('should export all required types', () => {
    expect(ConnectionStatus.CONNECTED).toBe('connected')
    expect(ConnectionStatus.DISCONNECTED).toBe('disconnected')
    expect(NetworkMessageType.GAME_ACTION).toBe('game_action')
    expect(NetworkMessageType.PING).toBe('ping')
  })

  it('should have all required methods on P2PManager', () => {
    const config = {
      localPlayerId: 'test-player',
      maxPeers: 4,
      enableNetworkMonitoring: true,
      enableAutoReconnect: true,
    }

    const p2pManager = new P2PManager(config)

    // Check that all required methods exist
    expect(typeof p2pManager.createRoom).toBe('function')
    expect(typeof p2pManager.joinRoom).toBe('function')
    expect(typeof p2pManager.leaveRoom).toBe('function')
    expect(typeof p2pManager.connectToPeer).toBe('function')
    expect(typeof p2pManager.sendGameAction).toBe('function')
    expect(typeof p2pManager.startGame).toBe('function')
    expect(typeof p2pManager.endGame).toBe('function')
    expect(typeof p2pManager.getConnectedPeers).toBe('function')
    expect(typeof p2pManager.getConnectionStatus).toBe('function')
    expect(typeof p2pManager.isNetworkSuitableForGameplay).toBe('function')
  })
})