import { GameState, PlayerAction } from '../types/game'
import { 
  RoomConfig, 
  ConnectionStatus, 
  NetworkMessage, 
  NetworkMessageType,
  NetworkQuality 
} from './types'
import { WebRTCHandler } from './connection/WebRTCHandler'
import { ConnectionRecovery } from './connection/ConnectionRecovery'
import { NetworkMonitor, NetworkMetrics, AdaptiveSettings } from './connection/NetworkMonitor'
import { StateSync, SyncConflict } from './connection/StateSync'

export interface P2PManagerConfig {
  localPlayerId: string
  maxPeers: number
  enableNetworkMonitoring: boolean
  enableAutoReconnect: boolean
  signalingServerUrl?: string
}

export interface RoomInfo {
  id: string
  hostId: string
  playerIds: string[]
  config: RoomConfig
  status: 'waiting' | 'starting' | 'active' | 'ended'
}

export class P2PManager {
  private config: P2PManagerConfig
  private webrtcHandler: WebRTCHandler
  private connectionRecovery: ConnectionRecovery
  private networkMonitor: NetworkMonitor
  private stateSync: StateSync
  private currentRoom: RoomInfo | null = null
  private isHost = false

  // Event callbacks
  private onRoomJoinedCallback?: (roomInfo: RoomInfo) => void
  private onPlayerJoinedCallback?: (playerId: string) => void
  private onPlayerLeftCallback?: (playerId: string) => void
  private onGameActionCallback?: (action: PlayerAction) => void
  private onGameStateUpdateCallback?: (gameState: GameState) => void
  private onConnectionStatusCallback?: (peerId: string, status: ConnectionStatus) => void
  private onNetworkQualityCallback?: (peerId: string, quality: NetworkQuality) => void
  private onErrorCallback?: (error: Error) => void

  constructor(config: P2PManagerConfig) {
    this.config = config
    
    // Initialize core components
    this.webrtcHandler = new WebRTCHandler(config.localPlayerId)
    this.connectionRecovery = new ConnectionRecovery(this.webrtcHandler)
    this.networkMonitor = new NetworkMonitor(this.webrtcHandler)
    this.stateSync = new StateSync(this.webrtcHandler, config.localPlayerId)

    this.setupEventHandlers()
  }

  /**
   * Set up event handlers between components
   */
  private setupEventHandlers(): void {
    // WebRTC connection changes
    this.webrtcHandler.onConnectionChange((peerId, status) => {
      this.handleConnectionChange(peerId, status)
    })

    // Network quality changes
    if (this.config.enableNetworkMonitoring) {
      this.networkMonitor.onQualityChange((peerId, quality, metrics) => {
        this.handleNetworkQualityChange(peerId, quality, metrics)
      })

      this.networkMonitor.onAdaptiveChange((settings) => {
        this.handleAdaptiveSettingsChange(settings)
      })
    }

    // State synchronization
    this.stateSync.onStateSync((gameState) => {
      this.onGameStateUpdateCallback?.(gameState)
    })

    this.stateSync.onAction((action) => {
      this.onGameActionCallback?.(action)
    })

    this.stateSync.onConflict((conflict) => {
      this.handleSyncConflict(conflict)
    })

    // Reconnection status
    this.connectionRecovery.onReconnectionStatus((peerId, attempt, maxAttempts) => {
      console.log(`Reconnection attempt ${attempt}/${maxAttempts} for peer ${peerId}`)
    })
  }

  /**
   * Create a new game room
   */
  async createRoom(roomConfig: RoomConfig): Promise<string> {
    try {
      const roomId = this.generateRoomId()
      
      this.currentRoom = {
        id: roomId,
        hostId: this.config.localPlayerId,
        playerIds: [this.config.localPlayerId],
        config: roomConfig,
        status: 'waiting',
      }
      
      this.isHost = true
      
      // Start monitoring if enabled
      if (this.config.enableNetworkMonitoring) {
        this.networkMonitor.startMonitoring()
      }
      
      console.log(`Created room ${roomId} as host`)
      this.onRoomJoinedCallback?.(this.currentRoom)
      
      return roomId
    } catch (error) {
      this.handleError(new Error(`Failed to create room: ${error}`))
      throw error
    }
  }

  /**
   * Join an existing game room
   */
  async joinRoom(roomId: string): Promise<void> {
    try {
      // In a real implementation, this would connect to a signaling server
      // For now, we'll simulate the room joining process
      
      this.currentRoom = {
        id: roomId,
        hostId: 'unknown', // Would be provided by signaling server
        playerIds: [this.config.localPlayerId],
        config: {
          maxPlayers: 4,
          isPrivate: false,
          gameSettings: { allowSpectators: true },
        },
        status: 'waiting',
      }
      
      this.isHost = false
      
      // Start monitoring if enabled
      if (this.config.enableNetworkMonitoring) {
        this.networkMonitor.startMonitoring()
      }
      
      console.log(`Joined room ${roomId}`)
      this.onRoomJoinedCallback?.(this.currentRoom)
      
    } catch (error) {
      this.handleError(new Error(`Failed to join room: ${error}`))
      throw error
    }
  }

  /**
   * Connect to a specific peer
   */
  async connectToPeer(peerId: string): Promise<void> {
    try {
      console.log(`Connecting to peer ${peerId}`)
      
      // Create peer connection
      await this.webrtcHandler.createPeerConnection(peerId)
      
      // Create data channel (if we're the initiator)
      this.webrtcHandler.createDataChannel(peerId)
      
      // Add peer to room
      if (this.currentRoom && !this.currentRoom.playerIds.includes(peerId)) {
        this.currentRoom.playerIds.push(peerId)
        this.onPlayerJoinedCallback?.(peerId)
      }
      
    } catch (error) {
      this.handleError(new Error(`Failed to connect to peer ${peerId}: ${error}`))
      throw error
    }
  }

  /**
   * Disconnect from a specific peer
   */
  disconnectFromPeer(peerId: string): void {
    try {
      console.log(`Disconnecting from peer ${peerId}`)
      
      this.webrtcHandler.closePeerConnection(peerId)
      
      // Remove peer from room
      if (this.currentRoom) {
        this.currentRoom.playerIds = this.currentRoom.playerIds.filter(id => id !== peerId)
        this.onPlayerLeftCallback?.(peerId)
      }
      
    } catch (error) {
      this.handleError(new Error(`Failed to disconnect from peer ${peerId}: ${error}`))
    }
  }

  /**
   * Send game action to all peers
   */
  sendGameAction(action: PlayerAction): void {
    try {
      this.stateSync.broadcastAction(action)
    } catch (error) {
      this.handleError(new Error(`Failed to send game action: ${error}`))
    }
  }

  /**
   * Start game session
   */
  startGame(initialGameState: GameState): void {
    try {
      if (!this.currentRoom) {
        throw new Error('No room joined')
      }
      
      this.currentRoom.status = 'active'
      this.stateSync.startSync(initialGameState)
      
      console.log('Game session started')
      
    } catch (error) {
      this.handleError(new Error(`Failed to start game: ${error}`))
      throw error
    }
  }

  /**
   * End game session
   */
  endGame(): void {
    try {
      if (this.currentRoom) {
        this.currentRoom.status = 'ended'
      }
      
      this.stateSync.stopSync()
      console.log('Game session ended')
      
    } catch (error) {
      this.handleError(new Error(`Failed to end game: ${error}`))
    }
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    try {
      if (!this.currentRoom) return
      
      console.log(`Leaving room ${this.currentRoom.id}`)
      
      // Disconnect from all peers
      const connectedPeers = this.webrtcHandler.getConnectedPeers()
      if (connectedPeers) {
        connectedPeers.forEach(peerId => {
          this.disconnectFromPeer(peerId)
        })
      }
      
      // Stop all services
      this.stateSync.stopSync()
      this.networkMonitor.stopMonitoring()
      this.connectionRecovery.stopAllReconnections()
      
      this.currentRoom = null
      this.isHost = false
      
    } catch (error) {
      this.handleError(new Error(`Failed to leave room: ${error}`))
    }
  }

  /**
   * Handle connection status changes
   */
  private handleConnectionChange(peerId: string, status: ConnectionStatus): void {
    console.log(`Connection status changed for peer ${peerId}: ${status}`)
    this.onConnectionStatusCallback?.(peerId, status)
    
    if (status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.FAILED) {
      this.onPlayerLeftCallback?.(peerId)
    } else if (status === ConnectionStatus.CONNECTED) {
      this.onPlayerJoinedCallback?.(peerId)
    }
  }

  /**
   * Handle network quality changes
   */
  private handleNetworkQualityChange(peerId: string, quality: NetworkQuality, metrics: NetworkMetrics): void {
    console.log(`Network quality changed for peer ${peerId}: ${quality}`)
    this.onNetworkQualityCallback?.(peerId, quality)
    
    // Take action based on quality
    if (quality === 'poor') {
      console.warn(`Poor network quality detected for peer ${peerId}`)
      // Could implement quality-based adaptations here
    }
  }

  /**
   * Handle adaptive settings changes
   */
  private handleAdaptiveSettingsChange(settings: AdaptiveSettings): void {
    console.log('Adaptive network settings updated:', settings)
    // Could notify the game engine about network adaptations
  }

  /**
   * Handle state synchronization conflicts
   */
  private handleSyncConflict(conflict: SyncConflict): void {
    console.warn('Game state synchronization conflict detected:', conflict.conflictType)
    // Could implement conflict resolution UI or automatic resolution
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('P2P Manager error:', error)
    this.onErrorCallback?.(error)
  }

  /**
   * Generate unique room ID
   */
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  /**
   * Get current room information
   */
  getCurrentRoom(): RoomInfo | null {
    return this.currentRoom
  }

  /**
   * Get connected peers
   */
  getConnectedPeers(): string[] {
    return this.webrtcHandler.getConnectedPeers()
  }

  /**
   * Get connection status for a peer
   */
  getConnectionStatus(peerId: string): ConnectionStatus | null {
    return this.webrtcHandler.getConnectionStatus(peerId)
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(peerId: string) {
    return await this.webrtcHandler.getNetworkStats(peerId)
  }

  /**
   * Get network quality summary
   */
  getNetworkSummary() {
    return this.networkMonitor.getNetworkSummary()
  }

  /**
   * Check if network is suitable for gameplay
   */
  isNetworkSuitableForGameplay(): boolean {
    return this.networkMonitor.isNetworkSuitableForGameplay()
  }

  /**
   * Force reconnection to all disconnected peers
   */
  async reconnectAll(): Promise<void> {
    await this.connectionRecovery.reconnectAllDisconnected()
  }

  /**
   * Update game state
   */
  updateGameState(gameState: GameState): void {
    this.stateSync.updateGameState(gameState)
  }

  /**
   * Force state synchronization
   */
  forceSyncState(): void {
    this.stateSync.forceSyncState()
  }

  // Event handler setters
  onRoomJoined(callback: (roomInfo: RoomInfo) => void): void {
    this.onRoomJoinedCallback = callback
  }

  onPlayerJoined(callback: (playerId: string) => void): void {
    this.onPlayerJoinedCallback = callback
  }

  onPlayerLeft(callback: (playerId: string) => void): void {
    this.onPlayerLeftCallback = callback
  }

  onGameAction(callback: (action: PlayerAction) => void): void {
    this.onGameActionCallback = callback
  }

  onGameStateUpdate(callback: (gameState: GameState) => void): void {
    this.onGameStateUpdateCallback = callback
  }

  onConnectionStatus(callback: (peerId: string, status: ConnectionStatus) => void): void {
    this.onConnectionStatusCallback = callback
  }

  onNetworkQuality(callback: (peerId: string, quality: NetworkQuality) => void): void {
    this.onNetworkQualityCallback = callback
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.leaveRoom()
    this.webrtcHandler.closeAllConnections()
  }
}