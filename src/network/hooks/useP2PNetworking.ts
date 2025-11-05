import { useState, useEffect, useCallback, useRef } from 'react'
import { GameState, PlayerAction } from '../../types/game'
import { P2PManager, P2PManagerConfig, RoomInfo } from '../P2PManager'
import { ConnectionStatus, NetworkQuality, RoomConfig } from '../types'

export interface UseP2PNetworkingOptions {
  localPlayerId: string
  enableNetworkMonitoring?: boolean
  enableAutoReconnect?: boolean
  maxPeers?: number
}

export interface P2PNetworkingState {
  isConnected: boolean
  currentRoom: RoomInfo | null
  connectedPeers: string[]
  connectionStatuses: Record<string, ConnectionStatus>
  networkQualities: Record<string, NetworkQuality>
  isHost: boolean
  error: Error | null
}

export function useP2PNetworking(options: UseP2PNetworkingOptions) {
  const [state, setState] = useState<P2PNetworkingState>({
    isConnected: false,
    currentRoom: null,
    connectedPeers: [],
    connectionStatuses: {},
    networkQualities: {},
    isHost: false,
    error: null,
  })

  const p2pManagerRef = useRef<P2PManager | null>(null)

  // Initialize P2P Manager
  useEffect(() => {
    const config: P2PManagerConfig = {
      localPlayerId: options.localPlayerId,
      maxPeers: options.maxPeers || 4,
      enableNetworkMonitoring: options.enableNetworkMonitoring ?? true,
      enableAutoReconnect: options.enableAutoReconnect ?? true,
    }

    const p2pManager = new P2PManager(config)
    p2pManagerRef.current = p2pManager

    // Set up event handlers
    p2pManager.onRoomJoined((roomInfo) => {
      setState(prev => ({
        ...prev,
        currentRoom: roomInfo,
        isHost: roomInfo.hostId === options.localPlayerId,
        isConnected: true,
        error: null,
      }))
    })

    p2pManager.onPlayerJoined((playerId) => {
      setState(prev => ({
        ...prev,
        connectedPeers: [...prev.connectedPeers.filter(id => id !== playerId), playerId],
      }))
    })

    p2pManager.onPlayerLeft((playerId) => {
      setState(prev => ({
        ...prev,
        connectedPeers: prev.connectedPeers.filter(id => id !== playerId),
        connectionStatuses: Object.fromEntries(
          Object.entries(prev.connectionStatuses).filter(([id]) => id !== playerId)
        ),
        networkQualities: Object.fromEntries(
          Object.entries(prev.networkQualities).filter(([id]) => id !== playerId)
        ),
      }))
    })

    p2pManager.onConnectionStatus((peerId, status) => {
      setState(prev => ({
        ...prev,
        connectionStatuses: {
          ...prev.connectionStatuses,
          [peerId]: status,
        },
      }))
    })

    p2pManager.onNetworkQuality((peerId, quality) => {
      setState(prev => ({
        ...prev,
        networkQualities: {
          ...prev.networkQualities,
          [peerId]: quality,
        },
      }))
    })

    p2pManager.onError((error) => {
      setState(prev => ({
        ...prev,
        error,
      }))
    })

    // Cleanup on unmount
    return () => {
      p2pManager.destroy()
    }
  }, [options.localPlayerId, options.maxPeers, options.enableNetworkMonitoring, options.enableAutoReconnect])

  // Create room
  const createRoom = useCallback(async (roomConfig: RoomConfig): Promise<string> => {
    if (!p2pManagerRef.current) {
      throw new Error('P2P Manager not initialized')
    }
    
    try {
      const roomId = await p2pManagerRef.current.createRoom(roomConfig)
      return roomId
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }))
      throw error
    }
  }, [])

  // Join room
  const joinRoom = useCallback(async (roomId: string): Promise<void> => {
    if (!p2pManagerRef.current) {
      throw new Error('P2P Manager not initialized')
    }
    
    try {
      await p2pManagerRef.current.joinRoom(roomId)
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }))
      throw error
    }
  }, [])

  // Leave room
  const leaveRoom = useCallback(() => {
    if (!p2pManagerRef.current) return
    
    p2pManagerRef.current.leaveRoom()
    setState(prev => ({
      ...prev,
      isConnected: false,
      currentRoom: null,
      connectedPeers: [],
      connectionStatuses: {},
      networkQualities: {},
      isHost: false,
      error: null,
    }))
  }, [])

  // Connect to peer
  const connectToPeer = useCallback(async (peerId: string): Promise<void> => {
    if (!p2pManagerRef.current) {
      throw new Error('P2P Manager not initialized')
    }
    
    try {
      await p2pManagerRef.current.connectToPeer(peerId)
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }))
      throw error
    }
  }, [])

  // Disconnect from peer
  const disconnectFromPeer = useCallback((peerId: string) => {
    if (!p2pManagerRef.current) return
    
    p2pManagerRef.current.disconnectFromPeer(peerId)
  }, [])

  // Send game action
  const sendGameAction = useCallback((action: PlayerAction) => {
    if (!p2pManagerRef.current) {
      throw new Error('P2P Manager not initialized')
    }
    
    p2pManagerRef.current.sendGameAction(action)
  }, [])

  // Start game
  const startGame = useCallback((initialGameState: GameState) => {
    if (!p2pManagerRef.current) {
      throw new Error('P2P Manager not initialized')
    }
    
    p2pManagerRef.current.startGame(initialGameState)
  }, [])

  // End game
  const endGame = useCallback(() => {
    if (!p2pManagerRef.current) return
    
    p2pManagerRef.current.endGame()
  }, [])

  // Update game state
  const updateGameState = useCallback((gameState: GameState) => {
    if (!p2pManagerRef.current) return
    
    p2pManagerRef.current.updateGameState(gameState)
  }, [])

  // Force state sync
  const forceSyncState = useCallback(() => {
    if (!p2pManagerRef.current) return
    
    p2pManagerRef.current.forceSyncState()
  }, [])

  // Reconnect all
  const reconnectAll = useCallback(async () => {
    if (!p2pManagerRef.current) return
    
    try {
      await p2pManagerRef.current.reconnectAll()
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }))
    }
  }, [])

  // Get network stats
  const getNetworkStats = useCallback(async (peerId: string) => {
    if (!p2pManagerRef.current) return null
    
    return await p2pManagerRef.current.getNetworkStats(peerId)
  }, [])

  // Check network suitability
  const isNetworkSuitableForGameplay = useCallback((): boolean => {
    if (!p2pManagerRef.current) return false
    
    return p2pManagerRef.current.isNetworkSuitableForGameplay()
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Set up game action listener
  const onGameAction = useCallback((callback: (action: PlayerAction) => void) => {
    if (!p2pManagerRef.current) return
    
    p2pManagerRef.current.onGameAction(callback)
  }, [])

  // Set up game state update listener
  const onGameStateUpdate = useCallback((callback: (gameState: GameState) => void) => {
    if (!p2pManagerRef.current) return
    
    p2pManagerRef.current.onGameStateUpdate(callback)
  }, [])

  return {
    // State
    ...state,
    
    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    connectToPeer,
    disconnectFromPeer,
    sendGameAction,
    startGame,
    endGame,
    updateGameState,
    forceSyncState,
    reconnectAll,
    
    // Utilities
    getNetworkStats,
    isNetworkSuitableForGameplay,
    clearError,
    
    // Event listeners
    onGameAction,
    onGameStateUpdate,
    
    // Direct access to manager (for advanced usage)
    p2pManager: p2pManagerRef.current,
  }
}