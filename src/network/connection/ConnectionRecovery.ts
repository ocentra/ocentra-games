import { ConnectionStatus, ReconnectionConfig } from '../types'
import { WebRTCHandler } from './WebRTCHandler'

export class ConnectionRecovery {
  private webrtcHandler: WebRTCHandler
  private reconnectionAttempts: Map<string, number> = new Map()
  private reconnectionTimers: Map<string, NodeJS.Timeout> = new Map()
  private config: ReconnectionConfig
  private onReconnectionStatusCallback?: (peerId: string, attempt: number, maxAttempts: number) => void

  constructor(webrtcHandler: WebRTCHandler, config?: Partial<ReconnectionConfig>) {
    this.webrtcHandler = webrtcHandler
    this.config = {
      maxAttempts: 5,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 1.5,
      ...config,
    }

    // Listen for connection changes
    this.webrtcHandler.onConnectionChange((peerId, status) => {
      this.handleConnectionChange(peerId, status)
    })
  }

  /**
   * Handle connection state changes and trigger reconnection if needed
   */
  private handleConnectionChange(peerId: string, status: ConnectionStatus): void {
    switch (status) {
      case ConnectionStatus.DISCONNECTED:
      case ConnectionStatus.FAILED:
        this.startReconnection(peerId)
        break
      case ConnectionStatus.CONNECTED:
        this.resetReconnectionState(peerId)
        break
    }
  }

  /**
   * Start reconnection process for a peer
   */
  private startReconnection(peerId: string): void {
    const currentAttempts = this.reconnectionAttempts.get(peerId) || 0
    
    if (currentAttempts >= this.config.maxAttempts) {
      console.log(`Max reconnection attempts reached for peer ${peerId}`)
      this.resetReconnectionState(peerId)
      return
    }

    const nextAttempt = currentAttempts + 1
    this.reconnectionAttempts.set(peerId, nextAttempt)

    const delay = this.calculateBackoffDelay(nextAttempt)
    
    console.log(`Scheduling reconnection attempt ${nextAttempt}/${this.config.maxAttempts} for peer ${peerId} in ${delay}ms`)
    
    this.onReconnectionStatusCallback?.(peerId, nextAttempt, this.config.maxAttempts)

    const timer = setTimeout(() => {
      this.attemptReconnection(peerId)
    }, delay)

    this.reconnectionTimers.set(peerId, timer)
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1)
    return Math.min(delay, this.config.maxDelay)
  }

  /**
   * Attempt to reconnect to a peer
   */
  private async attemptReconnection(peerId: string): Promise<void> {
    try {
      console.log(`Attempting to reconnect to peer ${peerId}`)
      
      // Close existing connection
      this.webrtcHandler.closePeerConnection(peerId)
      
      // Create new connection
      await this.webrtcHandler.createPeerConnection(peerId)
      
      // Create new data channel
      this.webrtcHandler.createDataChannel(peerId)
      
      console.log(`Reconnection initiated for peer ${peerId}`)
      
    } catch (error) {
      console.error(`Reconnection attempt failed for peer ${peerId}:`, error)
      
      // Schedule next attempt
      this.startReconnection(peerId)
    }
  }

  /**
   * Reset reconnection state for a peer
   */
  private resetReconnectionState(peerId: string): void {
    // Clear reconnection attempts
    this.reconnectionAttempts.delete(peerId)
    
    // Clear any pending timers
    const timer = this.reconnectionTimers.get(peerId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectionTimers.delete(peerId)
    }
  }

  /**
   * Manually trigger reconnection for a peer
   */
  async reconnectToPeer(peerId: string): Promise<void> {
    this.resetReconnectionState(peerId)
    await this.attemptReconnection(peerId)
  }

  /**
   * Stop all reconnection attempts
   */
  stopAllReconnections(): void {
    // Clear all timers
    this.reconnectionTimers.forEach((timer) => {
      clearTimeout(timer)
    })
    
    // Clear all state
    this.reconnectionAttempts.clear()
    this.reconnectionTimers.clear()
  }

  /**
   * Get current reconnection status for a peer
   */
  getReconnectionStatus(peerId: string): { attempt: number; maxAttempts: number } | null {
    const attempt = this.reconnectionAttempts.get(peerId)
    if (attempt === undefined) return null
    
    return {
      attempt,
      maxAttempts: this.config.maxAttempts,
    }
  }

  /**
   * Check if peer is currently reconnecting
   */
  isReconnecting(peerId: string): boolean {
    return this.reconnectionAttempts.has(peerId)
  }

  /**
   * Update reconnection configuration
   */
  updateConfig(newConfig: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Set callback for reconnection status updates
   */
  onReconnectionStatus(callback: (peerId: string, attempt: number, maxAttempts: number) => void): void {
    this.onReconnectionStatusCallback = callback
  }

  /**
   * Force reconnection for all disconnected peers
   */
  async reconnectAllDisconnected(): Promise<void> {
    const connectedPeers = this.webrtcHandler.getConnectedPeers()
    
    // Get all peers that should be connected but aren't
    // This would need to be implemented based on your room/session management
    // For now, we'll reconnect to peers that have reconnection state
    const disconnectedPeers = Array.from(this.reconnectionAttempts.keys())
    
    for (const peerId of disconnectedPeers) {
      if (!connectedPeers.includes(peerId)) {
        await this.reconnectToPeer(peerId)
      }
    }
  }

  /**
   * Get reconnection statistics
   */
  getReconnectionStats(): {
    totalAttempts: number
    activeReconnections: number
    failedPeers: string[]
  } {
    const totalAttempts = Array.from(this.reconnectionAttempts.values())
      .reduce((sum, attempts) => sum + attempts, 0)
    
    const activeReconnections = this.reconnectionTimers.size
    
    const failedPeers = Array.from(this.reconnectionAttempts.entries())
      .filter(([, attempts]) => attempts >= this.config.maxAttempts)
      .map(([peerId]) => peerId)

    return {
      totalAttempts,
      activeReconnections,
      failedPeers,
    }
  }
}