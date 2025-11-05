import { GameState, PlayerAction } from '../../types/game'
import { NetworkMessage, NetworkMessageType } from '../types'
import { WebRTCHandler } from './WebRTCHandler'

export interface StateSyncConfig {
  syncInterval: number
  checksumValidation: boolean
  conflictResolution: 'majority' | 'timestamp' | 'host'
  maxSyncRetries: number
}

export interface GameStateChecksum {
  hash: string
  timestamp: number
  round: number
  playerCount: number
}

export interface SyncConflict {
  localState: GameState
  remoteStates: Map<string, GameState>
  conflictType: 'checksum' | 'action' | 'phase'
  timestamp: number
}

export class StateSync {
  private webrtcHandler: WebRTCHandler
  private localPlayerId: string
  private currentGameState: GameState | null = null
  private config: StateSyncConfig
  private syncInterval: NodeJS.Timeout | null = null
  private pendingActions: Map<string, PlayerAction> = new Map()
  private actionHistory: PlayerAction[] = []
  private onStateSyncCallback?: (gameState: GameState) => void
  private onConflictCallback?: (conflict: SyncConflict) => void
  private onActionCallback?: (action: PlayerAction) => void

  constructor(
    webrtcHandler: WebRTCHandler,
    localPlayerId: string,
    config?: Partial<StateSyncConfig>
  ) {
    this.webrtcHandler = webrtcHandler
    this.localPlayerId = localPlayerId
    this.config = {
      syncInterval: 1000, // 1 second
      checksumValidation: true,
      conflictResolution: 'majority',
      maxSyncRetries: 3,
      ...config,
    }

    // Listen for incoming messages
    this.webrtcHandler.onMessage((message) => {
      this.handleNetworkMessage(message)
    })
  }

  /**
   * Start state synchronization
   */
  startSync(initialGameState: GameState): void {
    this.currentGameState = initialGameState
    
    if (this.syncInterval) return
    
    console.log('Starting game state synchronization')
    
    this.syncInterval = setInterval(() => {
      this.performSync()
    }, this.config.syncInterval)
  }

  /**
   * Stop state synchronization
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    console.log('Game state synchronization stopped')
  }

  /**
   * Handle incoming network messages
   */
  private handleNetworkMessage(message: NetworkMessage): void {
    switch (message.type) {
      case NetworkMessageType.GAME_ACTION:
        this.handleIncomingAction(message)
        break
      case NetworkMessageType.GAME_STATE_SYNC:
        this.handleStateSyncMessage(message)
        break
      case NetworkMessageType.PING:
        this.handlePing(message)
        break
    }
  }

  /**
   * Handle incoming player actions
   */
  private handleIncomingAction(message: NetworkMessage): void {
    try {
      const action = message.data as PlayerAction
      
      // Validate action
      if (!this.validateAction(action)) {
        console.warn('Invalid action received:', action)
        return
      }
      
      // Add to pending actions for processing
      this.pendingActions.set(action.playerId + '_' + action.timestamp.getTime(), action)
      
      // Notify callback
      this.onActionCallback?.(action)
      
    } catch (error) {
      console.error('Failed to handle incoming action:', error)
    }
  }

  /**
   * Handle state sync messages
   */
  private handleStateSyncMessage(message: NetworkMessage): void {
    try {
      const remoteState = message.data as GameState
      
      if (!this.currentGameState) return
      
      // Check for conflicts
      const conflict = this.detectStateConflict(remoteState)
      if (conflict) {
        this.handleStateConflict(conflict, message.senderId)
      }
      
    } catch (error) {
      console.error('Failed to handle state sync message:', error)
    }
  }

  /**
   * Handle ping messages (respond with pong)
   */
  private handlePing(message: NetworkMessage): void {
    const pongMessage: NetworkMessage = {
      type: NetworkMessageType.PONG,
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      data: message.data,
      messageId: `pong_${Date.now()}`,
    }
    
    this.webrtcHandler.sendMessage(message.senderId, pongMessage)
  }

  /**
   * Broadcast player action to all peers
   */
  broadcastAction(action: PlayerAction): void {
    // Add to local action history
    this.actionHistory.push(action)
    
    const message: NetworkMessage = {
      type: NetworkMessageType.GAME_ACTION,
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      data: action,
      messageId: `action_${action.playerId}_${action.timestamp.getTime()}`,
    }
    
    this.webrtcHandler.broadcastMessage(message)
  }

  /**
   * Perform periodic state synchronization
   */
  private performSync(): void {
    if (!this.currentGameState) return
    
    // Process pending actions
    this.processPendingActions()
    
    // Send state checksum for validation
    if (this.config.checksumValidation) {
      this.broadcastStateChecksum()
    }
  }

  /**
   * Process all pending actions
   */
  private processPendingActions(): void {
    if (this.pendingActions.size === 0) return
    
    // Sort actions by timestamp
    const sortedActions = Array.from(this.pendingActions.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    // Process each action
    for (const action of sortedActions) {
      if (this.validateAction(action)) {
        this.applyActionToState(action)
        this.actionHistory.push(action)
      }
    }
    
    // Clear processed actions
    this.pendingActions.clear()
    
    // Notify state update
    if (this.currentGameState) {
      this.onStateSyncCallback?.(this.currentGameState)
    }
  }

  /**
   * Validate player action against current game state
   */
  private validateAction(action: PlayerAction): boolean {
    if (!this.currentGameState) return false
    
    // Basic validation
    if (!action.playerId || !action.type || !action.timestamp) {
      return false
    }
    
    // Check if player exists
    const player = this.currentGameState.players.find(p => p.id === action.playerId)
    if (!player) return false
    
    // Check if it's player's turn (for turn-based actions)
    const currentPlayer = this.currentGameState.players[this.currentGameState.currentPlayer]
    if (currentPlayer.id !== action.playerId && 
        ['pick_up', 'decline', 'declare_intent'].includes(action.type)) {
      return false
    }
    
    // Additional game-specific validation would go here
    return true
  }

  /**
   * Apply action to current game state
   */
  private applyActionToState(action: PlayerAction): void {
    if (!this.currentGameState) return
    
    // This would integrate with your game engine's action processing
    // For now, we'll update the lastAction timestamp
    this.currentGameState.lastAction = action.timestamp
    
    // Update player state based on action type
    const player = this.currentGameState.players.find(p => p.id === action.playerId)
    if (!player) return
    
    switch (action.type) {
      case 'declare_intent':
        // Handle declare intent logic
        if (action.data && typeof action.data === 'object' && 'suit' in action.data) {
          player.declaredSuit = action.data.suit as any
        }
        break
      // Add other action types as needed
    }
  }

  /**
   * Broadcast state checksum for validation
   */
  private broadcastStateChecksum(): void {
    if (!this.currentGameState) return
    
    const checksum = this.calculateStateChecksum(this.currentGameState)
    
    const message: NetworkMessage = {
      type: NetworkMessageType.GAME_STATE_SYNC,
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      data: checksum,
      messageId: `checksum_${Date.now()}`,
    }
    
    this.webrtcHandler.broadcastMessage(message)
  }

  /**
   * Calculate checksum for game state
   */
  private calculateStateChecksum(gameState: GameState): GameStateChecksum {
    // Simple checksum calculation - in production, use a proper hash function
    const stateString = JSON.stringify({
      phase: gameState.phase,
      currentPlayer: gameState.currentPlayer,
      round: gameState.round,
      playersCount: gameState.players.length,
      deckSize: gameState.deck.length,
    })
    
    const hash = this.simpleHash(stateString)
    
    return {
      hash,
      timestamp: Date.now(),
      round: gameState.round,
      playerCount: gameState.players.length,
    }
  }

  /**
   * Simple hash function (replace with proper hash in production)
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  /**
   * Detect state conflicts
   */
  private detectStateConflict(remoteState: GameState): SyncConflict | null {
    if (!this.currentGameState) return null
    
    // Check for phase mismatch
    if (this.currentGameState.phase !== remoteState.phase) {
      return {
        localState: this.currentGameState,
        remoteStates: new Map([['remote', remoteState]]),
        conflictType: 'phase',
        timestamp: Date.now(),
      }
    }
    
    // Check for round mismatch
    if (this.currentGameState.round !== remoteState.round) {
      return {
        localState: this.currentGameState,
        remoteStates: new Map([['remote', remoteState]]),
        conflictType: 'checksum',
        timestamp: Date.now(),
      }
    }
    
    return null
  }

  /**
   * Handle state conflicts
   */
  private handleStateConflict(conflict: SyncConflict, senderId: string): void {
    console.warn('State conflict detected:', conflict.conflictType)
    
    switch (this.config.conflictResolution) {
      case 'majority':
        // Would need to collect states from all peers
        break
      case 'timestamp':
        // Use the state with the latest timestamp
        this.resolveByTimestamp(conflict)
        break
      case 'host':
        // Host wins conflicts (would need host designation)
        break
    }
    
    this.onConflictCallback?.(conflict)
  }

  /**
   * Resolve conflict by timestamp
   */
  private resolveByTimestamp(conflict: SyncConflict): void {
    const remoteState = Array.from(conflict.remoteStates.values())[0]
    
    if (remoteState.lastAction > conflict.localState.lastAction) {
      console.log('Adopting remote state due to newer timestamp')
      this.currentGameState = remoteState
      this.onStateSyncCallback?.(remoteState)
    }
  }

  /**
   * Update local game state
   */
  updateGameState(gameState: GameState): void {
    this.currentGameState = gameState
  }

  /**
   * Get current game state
   */
  getCurrentGameState(): GameState | null {
    return this.currentGameState
  }

  /**
   * Get action history
   */
  getActionHistory(): PlayerAction[] {
    return [...this.actionHistory]
  }

  /**
   * Clear action history
   */
  clearActionHistory(): void {
    this.actionHistory = []
  }

  /**
   * Set state sync callback
   */
  onStateSync(callback: (gameState: GameState) => void): void {
    this.onStateSyncCallback = callback
  }

  /**
   * Set conflict callback
   */
  onConflict(callback: (conflict: SyncConflict) => void): void {
    this.onConflictCallback = callback
  }

  /**
   * Set action callback
   */
  onAction(callback: (action: PlayerAction) => void): void {
    this.onActionCallback = callback
  }

  /**
   * Force full state sync
   */
  forceSyncState(): void {
    if (!this.currentGameState) return
    
    const message: NetworkMessage = {
      type: NetworkMessageType.GAME_STATE_SYNC,
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      data: this.currentGameState,
      messageId: `full_sync_${Date.now()}`,
    }
    
    this.webrtcHandler.broadcastMessage(message)
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    actionsProcessed: number
    pendingActions: number
    lastSyncTime: number
    conflictsDetected: number
  } {
    return {
      actionsProcessed: this.actionHistory.length,
      pendingActions: this.pendingActions.size,
      lastSyncTime: this.currentGameState?.lastAction.getTime() || 0,
      conflictsDetected: 0, // Would need to track this
    }
  }
}