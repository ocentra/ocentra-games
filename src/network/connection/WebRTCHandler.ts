import { PeerConnection, ConnectionStatus, NetworkMessage, NetworkStats } from '../types'

export class WebRTCHandler {
  private peers: Map<string, PeerConnection> = new Map()
  private localId: string
  private onMessageCallback?: (message: NetworkMessage) => void
  private onConnectionChangeCallback?: (peerId: string, status: ConnectionStatus) => void
  private configuration: RTCConfiguration

  constructor(localId: string) {
    this.localId = localId
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    }
  }

  /**
   * Create a new peer connection
   */
  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const connection = new RTCPeerConnection(this.configuration)
    
    const peerConnection: PeerConnection = {
      id: peerId,
      connection,
      dataChannel: null,
      status: ConnectionStatus.CONNECTING,
      lastPing: Date.now(),
      latency: 0,
      quality: 'good',
    }

    // Set up connection event handlers
    this.setupConnectionHandlers(peerConnection)
    
    this.peers.set(peerId, peerConnection)
    return connection
  }

  /**
   * Create data channel for peer-to-peer communication
   */
  createDataChannel(peerId: string, channelName = 'gameData'): RTCDataChannel | null {
    const peer = this.peers.get(peerId)
    if (!peer) return null

    const dataChannel = peer.connection.createDataChannel(channelName, {
      ordered: true,
      maxRetransmits: 3,
    })

    peer.dataChannel = dataChannel
    this.setupDataChannelHandlers(peer, dataChannel)
    
    return dataChannel
  }

  /**
   * Handle incoming data channel
   */
  private handleIncomingDataChannel(peer: PeerConnection, event: RTCDataChannelEvent): void {
    const dataChannel = event.channel
    peer.dataChannel = dataChannel
    this.setupDataChannelHandlers(peer, dataChannel)
  }

  /**
   * Set up connection event handlers
   */
  private setupConnectionHandlers(peer: PeerConnection): void {
    const { connection } = peer

    connection.oniceconnectionstatechange = () => {
      this.handleConnectionStateChange(peer)
    }

    connection.ondatachannel = (event) => {
      this.handleIncomingDataChannel(peer, event)
    }

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        // ICE candidate should be sent through signaling server
        this.handleIceCandidate(peer.id, event.candidate)
      }
    }
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannelHandlers(peer: PeerConnection, dataChannel: RTCDataChannel): void {
    dataChannel.onopen = () => {
      peer.status = ConnectionStatus.CONNECTED
      this.onConnectionChangeCallback?.(peer.id, peer.status)
    }

    dataChannel.onclose = () => {
      peer.status = ConnectionStatus.DISCONNECTED
      this.onConnectionChangeCallback?.(peer.id, peer.status)
    }

    dataChannel.onerror = (error) => {
      console.error(`Data channel error for peer ${peer.id}:`, error)
      peer.status = ConnectionStatus.FAILED
      this.onConnectionChangeCallback?.(peer.id, peer.status)
    }

    dataChannel.onmessage = (event) => {
      this.handleIncomingMessage(peer, event.data)
    }
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(peer: PeerConnection): void {
    const state = peer.connection.iceConnectionState
    
    switch (state) {
      case 'connected':
      case 'completed':
        peer.status = ConnectionStatus.CONNECTED
        break
      case 'disconnected':
        peer.status = ConnectionStatus.DISCONNECTED
        break
      case 'failed':
        peer.status = ConnectionStatus.FAILED
        break
      case 'connecting':
        peer.status = ConnectionStatus.CONNECTING
        break
    }

    this.onConnectionChangeCallback?.(peer.id, peer.status)
  }

  /**
   * Handle ICE candidates (to be sent through signaling)
   */
  private handleIceCandidate(peerId: string, candidate: RTCIceCandidate): void {
    // This should be implemented to send ICE candidates through signaling server
    console.log(`ICE candidate for peer ${peerId}:`, candidate)
  }

  /**
   * Handle incoming messages
   */
  private handleIncomingMessage(peer: PeerConnection, data: string): void {
    try {
      const message: NetworkMessage = JSON.parse(data)
      
      // Update latency for ping/pong messages
      if (message.type === 'pong') {
        peer.latency = Date.now() - peer.lastPing
        this.updateNetworkQuality(peer)
        return
      }

      this.onMessageCallback?.(message)
    } catch (error) {
      console.error('Failed to parse incoming message:', error)
    }
  }

  /**
   * Send message to specific peer
   */
  sendMessage(peerId: string, message: NetworkMessage): boolean {
    const peer = this.peers.get(peerId)
    if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') {
      return false
    }

    try {
      peer.dataChannel.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error(`Failed to send message to peer ${peerId}:`, error)
      return false
    }
  }

  /**
   * Broadcast message to all connected peers
   */
  broadcastMessage(message: NetworkMessage): void {
    this.peers.forEach((peer, peerId) => {
      this.sendMessage(peerId, message)
    })
  }

  /**
   * Send ping to measure latency
   */
  sendPing(peerId: string): void {
    const peer = this.peers.get(peerId)
    if (!peer) return

    peer.lastPing = Date.now()
    const pingMessage: NetworkMessage = {
      type: 'ping',
      senderId: this.localId,
      timestamp: peer.lastPing,
      data: null,
      messageId: `ping_${Date.now()}`,
    }

    this.sendMessage(peerId, pingMessage)
  }

  /**
   * Update network quality based on latency
   */
  private updateNetworkQuality(peer: PeerConnection): void {
    const latency = peer.latency
    
    if (latency < 50) {
      peer.quality = 'excellent'
    } else if (latency < 100) {
      peer.quality = 'good'
    } else if (latency < 200) {
      peer.quality = 'fair'
    } else {
      peer.quality = 'poor'
    }
  }

  /**
   * Get network statistics for a peer
   */
  async getNetworkStats(peerId: string): Promise<NetworkStats | null> {
    const peer = this.peers.get(peerId)
    if (!peer) return null

    try {
      const stats = await peer.connection.getStats()
      let latency = peer.latency
      let packetLoss = 0
      let bandwidth = 0
      let jitter = 0

      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = report.currentRoundTripTime * 1000 || latency
        }
        if (report.type === 'inbound-rtp') {
          packetLoss = report.packetsLost || 0
          jitter = report.jitter || 0
        }
        if (report.type === 'outbound-rtp') {
          bandwidth = report.bytesSent || 0
        }
      })

      return {
        latency,
        packetLoss,
        bandwidth,
        jitter,
        lastUpdated: Date.now(),
      }
    } catch (error) {
      console.error('Failed to get network stats:', error)
      return null
    }
  }

  /**
   * Close connection to specific peer
   */
  closePeerConnection(peerId: string): void {
    const peer = this.peers.get(peerId)
    if (!peer) return

    peer.dataChannel?.close()
    peer.connection.close()
    this.peers.delete(peerId)
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    this.peers.forEach((peer, peerId) => {
      this.closePeerConnection(peerId)
    })
  }

  /**
   * Get connection status for a peer
   */
  getConnectionStatus(peerId: string): ConnectionStatus | null {
    return this.peers.get(peerId)?.status || null
  }

  /**
   * Get all connected peer IDs
   */
  getConnectedPeers(): string[] {
    return Array.from(this.peers.entries())
      .filter(([, peer]) => peer.status === ConnectionStatus.CONNECTED)
      .map(([peerId]) => peerId)
  }

  /**
   * Set message callback
   */
  onMessage(callback: (message: NetworkMessage) => void): void {
    this.onMessageCallback = callback
  }

  /**
   * Set connection change callback
   */
  onConnectionChange(callback: (peerId: string, status: ConnectionStatus) => void): void {
    this.onConnectionChangeCallback = callback
  }
}